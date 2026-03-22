import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'node:http'
import type { ILLMProvider } from '../ai/runner/llm-provider.js'
import { GameLoop } from '../interface/game-loop.js'
import type { GameEventListener } from '../interface/game-loop.js'
import type { GenesisDocument } from '../domain/models/genesis.js'
import { ClientMessageSchema } from './protocol.js'
import type { ServerMessage } from './protocol.js'

// ============================================================
// GameSession — one per WebSocket connection
// ============================================================

class GameSession implements GameEventListener {
  private readonly ws: WebSocket
  private readonly gameLoop: GameLoop
  private initialized = false

  constructor(ws: WebSocket, provider: ILLMProvider, debug?: boolean | string) {
    this.ws = ws
    this.gameLoop = new GameLoop(provider, debug ? { debug } : undefined)
    this.gameLoop.setListener(this)
  }

  async handleMessage(raw: string): Promise<void> {
    let msg
    try {
      msg = ClientMessageSchema.parse(JSON.parse(raw))
    } catch {
      this.send({ type: 'error', message: '无效的消息格式' })
      return
    }

    switch (msg.type) {
      case 'ping':
        this.send({ type: 'pong' })
        break

      case 'initialize':
        if (this.initialized) {
          this.send({ type: 'error', message: '游戏已初始化' })
          return
        }
        try {
          await this.gameLoop.initialize()
          this.initialized = true
        } catch (err) {
          this.send({
            type: 'error',
            message: `初始化失败: ${err instanceof Error ? err.message : String(err)}`,
          })
        }
        break

      case 'input':
        if (!this.initialized) {
          this.send({ type: 'error', message: '游戏尚未初始化' })
          return
        }
        await this.gameLoop.processInput(msg.text)
        break

      case 'save':
        try {
          const saveId = await this.gameLoop.save()
          this.send({ type: 'save_result', saveId })
        } catch (err) {
          this.send({
            type: 'save_error',
            message: err instanceof Error ? err.message : String(err),
          })
        }
        break
    }
  }

  // ---- GameEventListener implementation ----

  onNarrative(text: string, source: string): void {
    this.send({ type: 'narrative', text, source })
  }

  onVoices(voices: Array<{ trait_id: string; line: string }>): void {
    this.send({ type: 'voices', voices })
  }

  onStatus(location: string, turn: number): void {
    this.send({ type: 'status', location, turn })
  }

  onError(message: string): void {
    this.send({ type: 'error', message })
  }

  onInitProgress(step: string): void {
    this.send({ type: 'init_progress', step })
  }

  onInitComplete(doc: GenesisDocument): void {
    this.send({ type: 'init_complete', doc })
  }

  // ---- Internal ----

  private send(msg: ServerMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }
}

// ============================================================
// GameServer — WebSocket server managing sessions
// ============================================================

export interface GameServerOptions {
  port: number
  provider: ILLMProvider
  debug?: boolean | string
}

export class GameServer {
  private wss: WebSocketServer | null = null
  private sessions = new Map<WebSocket, GameSession>()
  private readonly options: GameServerOptions

  constructor(options: GameServerOptions) {
    this.options = options
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.wss = new WebSocketServer({ port: this.options.port })

      this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
        const session = new GameSession(ws, this.options.provider, this.options.debug)
        this.sessions.set(ws, session)

        ws.on('message', async (data) => {
          try {
            await session.handleMessage(data.toString())
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'error', message: msg }))
            }
          }
        })

        ws.on('close', () => {
          this.sessions.delete(ws)
        })

        ws.on('error', () => {
          this.sessions.delete(ws)
        })
      })

      this.wss.on('listening', () => {
        resolve()
      })
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve()
        return
      }
      // Close all connections
      for (const ws of this.sessions.keys()) {
        ws.close()
      }
      this.sessions.clear()
      this.wss.close(() => resolve())
    })
  }

  get port(): number {
    return this.options.port
  }

  get connectionCount(): number {
    return this.sessions.size
  }
}
