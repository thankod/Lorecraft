#!/usr/bin/env node
/**
 * LLM Play Client — HTTP API bridge for LLM-driven gameplay testing.
 *
 * Connects to the game server's WebSocket and exposes a simple HTTP API
 * so an LLM agent (e.g. Claude Code) can play the game via curl.
 *
 * Usage:
 *   node tools/llm-play.mjs [--ws-port 3015] [--http-port 3020]
 *
 * Endpoints:
 *   GET  /state          — current game state (narrative, status, phase)
 *   GET  /narrative      — narrative text only (compact)
 *   GET  /debug          — debug info (phases, beat plan, traits, etc.)
 *   POST /action         — send player action  { "text": "..." }
 *   POST /style          — select style preset { "index": 0 } or { "index": -1 } for random
 *   POST /confirm        — confirm character creation (use current attributes)
 *   POST /reroll         — reroll attributes
 *   POST /insist         — insist on warned action
 *   POST /abandon        — abandon warned action
 *   POST /reset          — reset the game
 *   POST /retry          — retry last failed action
 */

import { WebSocket } from 'ws'
import http from 'node:http'

// ---- Config ----
const args = process.argv.slice(2)
function getArg(name, fallback) {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const WS_PORT = parseInt(getArg('--ws-port', '3015'))
const HTTP_PORT = parseInt(getArg('--http-port', '3020'))
const WS_URL = `ws://localhost:${WS_PORT}`

// ---- State ----
const state = {
  connected: false,
  phase: 'disconnected', // disconnected | connecting | style_select | char_create | playing | processing | insistence | error
  narrativeLines: [],
  voices: [],
  location: '',
  turn: 0,
  stylePresets: null,
  charAttributes: null,
  charMeta: null,
  initDoc: null,
  lastError: null,
  debugSteps: [],
  debugState: null,
  pendingResolve: null, // resolve function for waiting on action completion
  initLogs: [],
  checkResults: [],
}

// ---- WebSocket ----
let ws = null
let reconnectTimer = null

function connect() {
  if (ws) return
  state.phase = 'connecting'
  ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    state.connected = true
    log('WS connected')
    ws.send(JSON.stringify({ type: 'initialize' }))
  })

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      handleMessage(msg)
    } catch (e) {
      log('WS parse error:', e.message)
    }
  })

  ws.on('close', () => {
    state.connected = false
    state.phase = 'disconnected'
    ws = null
    log('WS disconnected, reconnecting in 3s...')
    reconnectTimer = setTimeout(connect, 3000)
  })

  ws.on('error', () => {
    // onclose will fire
  })
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'style_select':
      state.stylePresets = msg.presets
      state.phase = 'style_select'
      resolvePending()
      break

    case 'init_progress':
      state.initLogs.push(msg.step)
      break

    case 'init_complete':
      state.initDoc = msg.doc
      break

    case 'char_create':
      state.charAttributes = msg.attributes
      state.charMeta = msg.attribute_meta
      state.phase = 'char_create'
      resolvePending()
      break

    case 'narrative':
      state.narrativeLines.push({ text: msg.text, source: msg.source })
      // If we were processing, check if this completes the turn
      if (state.phase === 'processing' && (msg.source === 'event' || msg.source === 'inciting_event' || msg.source === 'rejection')) {
        state.phase = 'playing'
        resolvePending()
      }
      break

    case 'voices':
      state.voices.push(...msg.voices)
      break

    case 'check':
      state.checkResults.push(msg)
      break

    case 'status':
      state.location = msg.location
      state.turn = msg.turn
      break

    case 'error':
      state.lastError = msg.message
      if (state.phase === 'processing') {
        state.phase = 'playing'
        resolvePending()
      }
      break

    case 'insistence_prompt':
      state.phase = 'insistence'
      resolvePending()
      break

    case 'debug_turn_start':
      state.debugSteps = []
      break

    case 'debug_step':
      state.debugSteps.push({ step: msg.step, phase: msg.phase, status: msg.status, duration_ms: msg.duration_ms })
      break

    case 'debug_state':
      state.debugState = msg.states
      break

    case 'history':
      // Replay
      state.narrativeLines = []
      state.voices = []
      state.checkResults = []
      state.initLogs = []
      for (const m of msg.messages) {
        handleMessage(m)
      }
      if (state.initDoc && state.turn > 0) {
        state.phase = 'playing'
      }
      resolvePending()
      break

    case 'session_list':
      // If sessions exist and we're not initialized, auto-start new game
      if (state.phase === 'connecting') {
        log('Existing sessions found, starting new session')
        send({ type: 'new_session' })
      }
      break

    case 'reset_complete':
      state.narrativeLines = []
      state.voices = []
      state.checkResults = []
      state.initLogs = []
      state.initDoc = null
      state.charAttributes = null
      state.charMeta = null
      state.debugSteps = []
      state.debugState = null
      state.lastError = null
      state.phase = 'connecting'
      // Re-initialize
      send({ type: 'initialize' })
      resolvePending()
      break

    case 'pong':
      break

    default:
      // Ignore unknown types
      break
  }
}

function resolvePending() {
  if (state.pendingResolve) {
    const fn = state.pendingResolve
    state.pendingResolve = null
    fn()
  }
}

/** Wait for the next state change (with timeout) */
function waitForChange(timeoutMs = 180000) {
  return new Promise((resolve) => {
    state.pendingResolve = resolve
    setTimeout(() => {
      if (state.pendingResolve === resolve) {
        state.pendingResolve = null
        resolve()
      }
    }, timeoutMs)
  })
}

// ---- HTTP Server ----
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  // Parse body for POST
  let body = null
  if (req.method === 'POST') {
    body = await readBody(req)
  }

  try {
    const url = new URL(req.url, `http://localhost:${HTTP_PORT}`)
    const path = url.pathname

    if (req.method === 'GET' && path === '/state') {
      return json(res, getState())
    }

    if (req.method === 'GET' && path === '/narrative') {
      return json(res, getNarrative())
    }

    if (req.method === 'GET' && path === '/debug') {
      return json(res, getDebug())
    }

    if (req.method === 'POST' && path === '/style') {
      const index = body?.index ?? 0
      send({ type: 'select_style', preset_index: index })
      state.phase = 'processing'
      await waitForChange()
      return json(res, getState())
    }

    if (req.method === 'POST' && path === '/confirm') {
      if (state.phase !== 'char_create') {
        return json(res, { error: 'Not in character creation phase' }, 400)
      }
      send({ type: 'confirm_attributes', attributes: state.charAttributes })
      state.phase = 'processing'
      await waitForChange()
      return json(res, getState())
    }

    if (req.method === 'POST' && path === '/reroll') {
      send({ type: 'reroll_attributes' })
      await waitForChange()
      return json(res, { attributes: state.charAttributes, meta: state.charMeta })
    }

    if (req.method === 'POST' && path === '/action') {
      if (!body?.text) {
        return json(res, { error: 'Missing "text" field' }, 400)
      }
      if (state.phase !== 'playing') {
        return json(res, { error: `Cannot act in phase: ${state.phase}` }, 400)
      }
      // Clear per-turn state
      const prevNarrativeCount = state.narrativeLines.length
      const prevVoiceCount = state.voices.length
      const prevCheckCount = state.checkResults.length
      state.lastError = null
      state.debugSteps = []

      send({ type: 'input', text: body.text })
      state.phase = 'processing'
      await waitForChange()

      // Return only the new content from this turn
      const newNarrative = state.narrativeLines.slice(prevNarrativeCount)
      const newVoices = state.voices.slice(prevVoiceCount)
      const newChecks = state.checkResults.slice(prevCheckCount)

      return json(res, {
        turn: state.turn,
        location: state.location,
        phase: state.phase,
        narrative: newNarrative,
        voices: newVoices,
        checks: newChecks,
        error: state.lastError,
        debug_steps: state.debugSteps.filter(s => s.phase === 'end').map(s => ({
          step: s.step,
          status: s.status,
          duration_ms: s.duration_ms,
        })),
      })
    }

    if (req.method === 'POST' && path === '/insist') {
      send({ type: 'insist' })
      state.phase = 'processing'
      await waitForChange()
      return json(res, getState())
    }

    if (req.method === 'POST' && path === '/abandon') {
      send({ type: 'abandon' })
      state.phase = 'playing'
      return json(res, { ok: true })
    }

    if (req.method === 'POST' && path === '/reset') {
      send({ type: 'reset' })
      await waitForChange()
      return json(res, { ok: true, phase: state.phase })
    }

    if (req.method === 'POST' && path === '/retry') {
      send({ type: 'retry' })
      state.phase = 'processing'
      await waitForChange()
      return json(res, getState())
    }

    return json(res, { error: 'Not found' }, 404)
  } catch (e) {
    return json(res, { error: e.message }, 500)
  }
})

// ---- Helpers ----

function getState() {
  const recentNarrative = state.narrativeLines.slice(-20)
  return {
    phase: state.phase,
    connected: state.connected,
    turn: state.turn,
    location: state.location,
    style_presets: state.phase === 'style_select' ? state.stylePresets : undefined,
    char_attributes: state.phase === 'char_create' ? state.charAttributes : undefined,
    char_meta: state.phase === 'char_create' ? state.charMeta : undefined,
    world: state.initDoc ? {
      tone: state.initDoc.world_setting?.tone,
      background: state.initDoc.world_setting?.background,
      player_name: state.initDoc.characters?.player_character?.name,
      player_background: state.initDoc.characters?.player_character?.background,
    } : undefined,
    recent_narrative: recentNarrative,
    last_error: state.lastError,
    init_logs: state.initLogs.length > 0 ? state.initLogs : undefined,
  }
}

function getNarrative() {
  // Compact: just text, no metadata noise
  const lines = state.narrativeLines
    .filter(l => l.text && l.source !== 'system' && l.source !== 'spacer')
    .map(l => {
      const prefix = l.source === 'voice' ? '[内心] '
        : l.source === 'check-pass' ? '[检定✓] '
        : l.source === 'check-fail' ? '[检定✗] '
        : l.source === 'rejection' ? '[拒绝] '
        : l.source === 'inciting' ? '[序幕] '
        : ''
      return prefix + l.text
    })
  return {
    turn: state.turn,
    location: state.location,
    total_lines: lines.length,
    text: lines.join('\n'),
  }
}

function getDebug() {
  return {
    turn: state.turn,
    location: state.location,
    debug_state: state.debugState,
    last_steps: state.debugSteps.filter(s => s.phase === 'end').map(s => ({
      step: s.step,
      status: s.status,
      duration_ms: s.duration_ms,
    })),
    init_logs: state.initLogs,
    total_narrative_lines: state.narrativeLines.length,
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString()
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(null)
      }
    })
  })
}

function json(res, data, status = 200) {
  res.writeHead(status)
  res.end(JSON.stringify(data, null, 2))
}

function log(...args) {
  console.error('[llm-play]', ...args)
}

// ---- Start ----
server.listen(HTTP_PORT, () => {
  log(`HTTP API listening on http://localhost:${HTTP_PORT}`)
  log(`Connecting to game server at ${WS_URL}`)
  log('')
  log('Endpoints:')
  log('  GET  /state     — current game state')
  log('  GET  /narrative — all narrative text')
  log('  GET  /debug     — debug info')
  log('  POST /style     — {"index": 0}  (-1 = random)')
  log('  POST /confirm   — confirm character')
  log('  POST /reroll    — reroll attributes')
  log('  POST /action    — {"text": "做某事"}')
  log('  POST /insist    — insist on action')
  log('  POST /abandon   — abandon action')
  log('  POST /reset     — reset game')
  log('  POST /retry     — retry failed action')
  log('')
  connect()
})
