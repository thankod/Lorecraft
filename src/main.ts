#!/usr/bin/env node

import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { setGlobalDispatcher, ProxyAgent } from 'undici'
import type { ILLMProvider } from './ai/runner/llm-provider.js'
import { loadPromptsFromDirectory } from './ai/prompt/prompt-loader.js'
import { initPrompts } from './ai/prompt/prompts.js'
import { loadLLMConfig, detectEnvConfig, createProviderFromConfig } from './server/llm-config.js'

// ============================================================
// Config Loading: ~/.config/lorecraft/.env → project .env → env vars
// ============================================================

function loadConfig(): void {
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
  const globalEnv = join(xdgConfig, 'lorecraft', '.env')

  if (existsSync(globalEnv)) {
    config({ path: globalEnv })
    return
  }

  config()
}

loadConfig()

// ============================================================
// Proxy Setup
// ============================================================

function setupProxy(): void {
  const proxyUrl =
    process.env.https_proxy ??
    process.env.HTTPS_PROXY ??
    process.env.http_proxy ??
    process.env.HTTP_PROXY ??
    process.env.ALL_PROXY

  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  }
}

setupProxy()

// ============================================================
// Provider Selection
// ============================================================

function createProvider(): ILLMProvider {
  const savedConfig = loadLLMConfig()
  if (savedConfig && savedConfig.api_key) {
    try {
      const provider = createProviderFromConfig(savedConfig)
      console.log(`[LLM] Using saved config: ${savedConfig.provider} / ${savedConfig.model || 'default'}`)
      return provider
    } catch {
      console.warn('[LLM] Saved config invalid, falling back to env vars')
    }
  }

  const envConfig = detectEnvConfig()
  if (envConfig) {
    console.log(`[LLM] Using env config: ${envConfig.provider} / ${envConfig.model || 'default'}`)
    return createProviderFromConfig(envConfig)
  }

  console.error('No API key found.')
  console.error('')
  console.error('Create config at ~/.config/lorecraft/.env :')
  console.error('')
  console.error('  mkdir -p ~/.config/lorecraft')
  console.error('  cp .env.example ~/.config/lorecraft/.env')
  console.error('  # Then edit ~/.config/lorecraft/.env and fill in your API key')
  console.error('')
  console.error('Supported keys:')
  console.error('  GEMINI_API_KEY       (Google Gemini)')
  console.error('  ANTHROPIC_API_KEY    (Anthropic Claude)')
  console.error('  OPENAI_API_KEY       (OpenAI or compatible APIs)')
  console.error('  XAI_API_KEY          (xAI Grok)')
  process.exit(1)
}

// ============================================================
// CLI Argument Parsing
// ============================================================

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  const next = process.argv[idx + 1]
  return next && !next.startsWith('-') ? next : undefined
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const debug = hasFlag('--debug')
  const debugPath = debug ? (getArgValue('--debug') ?? './debug.log') : undefined
  const port = parseInt(getArgValue('--port') ?? process.env.PORT ?? '3016', 10)

  const xdgData = process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share')
  const dbPath = getArgValue('--db') ?? join(xdgData, 'lorecraft', 'game.db')

  // Initialize prompt registry from filesystem
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const promptsDir = join(__dirname, '..', 'prompts')
  initPrompts(loadPromptsFromDirectory(promptsDir))

  const provider = createProvider()

  const { AppServer } = await import('./server/game-server.js')
  const server = new AppServer({ port, provider, debug: debugPath, dbPath })
  await server.start()

  console.log(`Lorecraft running at http://localhost:${port}`)
  console.log(`[DB] ${dbPath}`)
  if (debug) console.log(`[DEBUG] ${debugPath}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
