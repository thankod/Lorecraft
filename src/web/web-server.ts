import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PUBLIC_DIR = join(__dirname, 'public')

export const DEFAULT_WEB_PORT = 3016

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

export interface WebServerOptions {
  port: number
  wsPort: number
}

export class WebServer {
  private server: ReturnType<typeof createServer> | null = null
  private readonly options: WebServerOptions

  constructor(options: WebServerOptions) {
    this.options = options
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer(async (req, res) => {
        // Inject WS_PORT config for the frontend
        if (req.url === '/config.js') {
          res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
          res.end(`window.__LORECRAFT_WS_PORT__ = ${this.options.wsPort};`)
          return
        }

        let filePath = req.url === '/' ? '/index.html' : req.url ?? '/index.html'

        // Prevent path traversal
        filePath = filePath.split('?')[0]
        if (filePath.includes('..')) {
          res.writeHead(403)
          res.end()
          return
        }

        const fullPath = join(PUBLIC_DIR, filePath)
        const ext = extname(fullPath)
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

        try {
          const data = await readFile(fullPath)
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(data)
        } catch {
          // SPA fallback: serve index.html for unknown routes
          try {
            const indexData = await readFile(join(PUBLIC_DIR, 'index.html'))
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(indexData)
          } catch {
            res.writeHead(404)
            res.end('Not Found')
          }
        }
      })

      this.server.listen(this.options.port, () => resolve())
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) { resolve(); return }
      this.server.close(() => resolve())
    })
  }
}
