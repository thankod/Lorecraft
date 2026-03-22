import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/useGameStore'
import type { ServerMessage } from '../types/protocol'

const WS_PORT = window.__LORECRAFT_WS_PORT__ || 3015
const WS_URL = `ws://${location.hostname}:${WS_PORT}`
const RECONNECT_DELAY = 3000
const PING_INTERVAL = 30000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const store = useGameStore

  useEffect(() => {
    let unmounted = false

    function connect() {
      if (unmounted) return
      store.getState().setConnectionStatus('connecting')

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        store.getState().setConnectionStatus('connected')
        store.getState().setSend((msg) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg))
          }
        })
        store.getState().appendNarrative('已连接到服务器…', 'system')
        ws.send(JSON.stringify({ type: 'initialize' }))

        // Heartbeat
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, PING_INTERVAL)
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as ServerMessage
          handleMessage(msg)
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        cleanup()
        store.getState().setConnectionStatus('disconnected')
        store.getState().setInputEnabled(false)
        store.getState().setSend(() => {})
        if (!unmounted) {
          store.getState().appendNarrative('与服务器的连接已断开，正在重连…', 'error')
          setTimeout(connect, RECONNECT_DELAY)
        }
      }

      ws.onerror = () => {
        // onclose will fire
      }
    }

    function cleanup() {
      if (pingRef.current) {
        clearInterval(pingRef.current)
        pingRef.current = null
      }
    }

    function handleMessage(msg: ServerMessage) {
      const s = store.getState()

      switch (msg.type) {
        case 'narrative': {
          const cls = msg.source === 'rejection' ? 'rejection'
            : msg.source === 'inciting_event' ? 'inciting'
            : 'event'
          const prefix = msg.source === 'rejection' ? '[旁白] '
            : msg.source === 'inciting_event' ? '[序幕] '
            : ''
          s.appendNarrative(prefix + msg.text, cls)
          if (s.isProcessing) {
            s.setProcessing(false)
            s.setInputEnabled(true)
          }
          break
        }

        case 'voices':
          s.appendVoices(msg.voices)
          break

        case 'status':
          s.setStatus(msg.location, msg.turn)
          break

        case 'error':
          s.appendNarrative(`[错误] ${msg.message}`, 'error')
          if (s.isProcessing) {
            s.setProcessing(false)
            s.setInputEnabled(true)
          }
          break

        case 'init_progress':
          s.appendNarrative(msg.step, 'system')
          break

        case 'init_complete': {
          const doc = msg.doc
          s.setInitDoc(doc)
          const ws = doc?.world_setting || {}
          const pc = doc?.characters?.player_character || {}
          s.appendNarrative('', 'spacer')
          s.appendNarrative(`═══ ${ws.tone || ''} ═══`, 'world-title')
          s.appendNarrative('', 'spacer')
          s.appendNarrative(ws.background || '', 'world-bg')
          s.appendNarrative('', 'spacer')
          s.appendNarrative(`你是 ${pc.name || ''}。${pc.background || ''}`, 'player-intro')
          s.appendNarrative('', 'spacer')
          s.appendNarrative('─────────────────────────────', 'separator')
          s.appendNarrative('', 'spacer')
          s.setInputEnabled(true)
          break
        }

        case 'save_result':
          s.appendNarrative(`[系统] 存档成功: ${msg.saveId.slice(0, 8)}…`, 'system')
          break

        case 'save_error':
          s.appendNarrative(`[系统] 存档失败: ${msg.message}`, 'error')
          break

        case 'pong':
          break
      }
    }

    connect()

    return () => {
      unmounted = true
      cleanup()
      wsRef.current?.close()
    }
  }, [])
}
