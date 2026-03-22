import blessed from 'blessed'
import WebSocket from 'ws'
import type { ServerMessage, ClientMessage } from '../server/protocol.js'

// ============================================================
// Color Palette (same as TUIApp)
// ============================================================

const COLORS = {
  bg: 'black',
  fg: '#c0c0c0',
  border: '#444444',
  title: '#e0a040',
  narrative: '#d0d0d0',
  voice: '#70a0d0',
  input: '#e0e0e0',
  status: '#808080',
  error: '#d04040',
  system: '#60a060',
  highlight: '#e0c070',
}

// ============================================================
// TUI Client — connects to GameServer via WebSocket
// ============================================================

export class TUIClient {
  private screen!: blessed.Widgets.Screen
  private narrativeBox!: blessed.Widgets.BoxElement
  private voiceBox!: blessed.Widgets.BoxElement
  private inputBox!: blessed.Widgets.TextboxElement
  private statusBar!: blessed.Widgets.BoxElement
  private ws: WebSocket | null = null
  private readonly url: string
  private narrativeLines: string[] = []
  private voiceLines: string[] = []
  private isProcessing = false

  constructor(url: string) {
    this.url = url
  }

  async start(): Promise<void> {
    this.buildUI()
    this.appendNarrative(`{#60a060-fg}正在连接服务器 ${this.url}…{/}`)
    this.screen.render()

    try {
      await this.connect()
      this.appendNarrative('{#60a060-fg}已连接，正在初始化游戏世界…{/}')
      this.screen.render()
      this.send({ type: 'initialize' })
    } catch (err) {
      this.appendNarrative(`{bold}{#d04040-fg}连接失败: ${err instanceof Error ? err.message : String(err)}{/}`)
      this.screen.render()
    }
  }

  // ---- WebSocket ----

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.on('open', () => resolve())
      this.ws.on('error', (err) => reject(err))

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as ServerMessage
          this.handleServerMessage(msg)
        } catch {
          // Ignore malformed messages
        }
      })

      this.ws.on('close', () => {
        this.appendNarrative('{bold}{#d04040-fg}[系统] 与服务器的连接已断开{/}')
        this.screen.render()
      })
    })
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  // ---- Server Message Handling ----

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'narrative':
        this.onNarrative(msg.text, msg.source)
        break
      case 'voices':
        this.onVoices(msg.voices)
        break
      case 'status':
        this.onStatus(msg.location, msg.turn)
        break
      case 'error':
        this.onError(msg.message)
        break
      case 'init_progress':
        this.onInitProgress(msg.step)
        break
      case 'init_complete':
        this.onInitComplete(msg.doc as any)
        this.focusInput()
        break
      case 'save_result':
        this.appendNarrative(`{#60a060-fg}[系统] 存档成功: ${msg.saveId.slice(0, 8)}…{/}`)
        this.screen.render()
        break
      case 'save_error':
        this.appendNarrative(`{#d04040-fg}[系统] 存档失败: ${msg.message}{/}`)
        this.screen.render()
        break
      case 'pong':
        break
    }
  }

  // ---- Event Handlers (same rendering as TUIApp) ----

  private onNarrative(text: string, source: string): void {
    const prefix = this.getSourcePrefix(source)
    this.appendNarrative(`${prefix}${this.escapeTag(text)}`)

    // If this was a response to input, clear processing state
    if (this.isProcessing) {
      this.isProcessing = false
      this.inputBox.setLabel(' 输入 ')
      this.appendNarrative('')
      this.focusInput()
    }

    this.screen.render()
  }

  private onVoices(voices: Array<{ trait_id: string; line: string }>): void {
    for (const voice of voices) {
      this.voiceLines.push(`{bold}{#70a0d0-fg}[${this.escapeTag(voice.trait_id)}]{/}`)
      this.voiceLines.push(this.escapeTag(voice.line))
      this.voiceLines.push('')
    }
    this.voiceBox.setContent(this.voiceLines.join('\n'))
    this.voiceBox.setScrollPerc(100)
    this.screen.render()
  }

  private onStatus(location: string, turn: number): void {
    this.statusBar.setContent(` 📍 ${location}  |  ⏳ 第 ${turn} 轮`)
    this.screen.render()
  }

  private onError(message: string): void {
    this.appendNarrative(`{bold}{#d04040-fg}[错误] ${this.escapeTag(message)}{/}`)
    if (this.isProcessing) {
      this.isProcessing = false
      this.inputBox.setLabel(' 输入 ')
      this.focusInput()
    }
    this.screen.render()
  }

  private onInitProgress(step: string): void {
    this.appendNarrative(`{#60a060-fg}${this.escapeTag(step)}{/}`)
    this.screen.render()
  }

  private onInitComplete(doc: any): void {
    this.appendNarrative('')
    this.appendNarrative(`{bold}{#e0a040-fg}═══ ${this.escapeTag(doc.world_setting?.tone ?? '')} ═══{/}`)
    this.appendNarrative('')
    this.appendNarrative(`{#808080-fg}${this.escapeTag(doc.world_setting?.background ?? '')}{/}`)
    this.appendNarrative('')
    this.appendNarrative(`{#60a060-fg}你是 ${this.escapeTag(doc.characters?.player_character?.name ?? '')}。${this.escapeTag(doc.characters?.player_character?.background ?? '')}{/}`)
    this.appendNarrative('')
    this.appendNarrative('{bold}{#e0a040-fg}─────────────────────────────{/}')
    this.appendNarrative('')
    this.screen.render()
  }

  // ---- Input Handling ----

  private async handleInput(value: string): Promise<void> {
    const input = value.trim()
    if (!input || this.isProcessing) {
      this.focusInput()
      return
    }

    this.appendNarrative(`{bold}{#e0c070-fg}> ${this.escapeTag(input)}{/}`)
    this.appendNarrative('')
    this.screen.render()

    this.isProcessing = true
    this.inputBox.clearValue()
    this.inputBox.setLabel(' 处理中… ')
    this.screen.render()

    this.send({ type: 'input', text: input })
  }

  // ---- UI Construction ----

  private buildUI(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      forceUnicode: true,
      title: 'Lorecraft',
      cursor: { shape: 'line', blink: true, color: COLORS.highlight, artificial: true },
    })

    blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' ⚔  LORECRAFT (client) ',
      style: { fg: COLORS.title, bg: '#1a1a1a', bold: true },
    })

    this.narrativeBox = blessed.box({
      parent: this.screen,
      label: ' 叙事 ',
      top: 1,
      left: 0,
      width: '75%',
      height: '100%-5',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { style: { bg: '#333333' } },
      keys: true,
      mouse: true,
      border: { type: 'line' },
      style: {
        fg: COLORS.narrative,
        bg: COLORS.bg,
        border: { fg: COLORS.border },
        label: { fg: COLORS.title, bold: true },
        scrollbar: { bg: '#333333' },
      },
      tags: true,
      padding: { left: 1, right: 1 },
    })

    this.voiceBox = blessed.box({
      parent: this.screen,
      label: ' 内心声音 ',
      top: 1,
      right: 0,
      width: '25%',
      height: '100%-5',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      mouse: true,
      border: { type: 'line' },
      style: {
        fg: COLORS.voice,
        bg: COLORS.bg,
        border: { fg: COLORS.border },
        label: { fg: COLORS.voice, bold: true },
      },
      tags: true,
      padding: { left: 1, right: 1 },
    })

    this.inputBox = blessed.textbox({
      parent: this.screen,
      label: ' 输入 ',
      bottom: 1,
      left: 0,
      width: '100%',
      height: 3,
      border: { type: 'line' },
      style: {
        fg: COLORS.input,
        bg: '#0a0a0a',
        border: { fg: COLORS.border },
        label: { fg: COLORS.highlight, bold: true },
      },
      inputOnFocus: false,
      keys: true,
      mouse: true,
      padding: { left: 1 },
    })

    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 4,
      left: 0,
      width: '75%',
      height: 1,
      content: '',
      style: { fg: COLORS.status, bg: '#111111' },
      padding: { left: 1 },
    })

    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' {bold}Enter{/bold} 发送 | {bold}Esc/q{/bold} 退出 | {bold}Ctrl+S{/bold} 存档 | {bold}↑↓{/bold} 滚动',
      style: { fg: '#606060', bg: '#0a0a0a' },
      tags: true,
    })

    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.ws?.close()
      this.screen.destroy()
      process.exit(0)
    })

    this.screen.key(['C-s'], () => {
      this.send({ type: 'save' })
    })

    this.inputBox.on('submit', async (value: string) => {
      await this.handleInput(value)
    })

    this.narrativeBox.on('click', () => {
      this.focusInput()
    })

    this.screen.render()
  }

  // ---- Helpers ----

  private appendNarrative(line: string): void {
    this.narrativeLines.push(line)
    this.narrativeBox.setContent(this.narrativeLines.join('\n'))
    this.narrativeBox.setScrollPerc(100)
  }

  private focusInput(): void {
    this.inputBox.clearValue()
    this.screen.render()
    this.inputBox.readInput()
  }

  private getSourcePrefix(source: string): string {
    switch (source) {
      case 'event': return ''
      case 'rejection': return '{#808080-fg}[旁白] {/}'
      case 'inciting_event': return '{bold}{#e0a040-fg}[序幕] {/}'
      default: return ''
    }
  }

  private escapeTag(str: string): string {
    return str.replace(/\{/g, '\\{').replace(/\}/g, '\\}')
  }
}
