import { appendFileSync, writeFileSync } from 'node:fs'
import type { IDebugLogger } from './debug-logger.js'

export class FileDebugLogger implements IDebugLogger {
  constructor(private path: string) {
    writeFileSync(this.path, `=== Lorecraft Debug Log ===\nStarted: ${new Date().toISOString()}\n\n`)
  }
  write(text: string): void {
    writeFileSync(this.path, text)
  }
  append(text: string): void {
    appendFileSync(this.path, text)
  }
}
