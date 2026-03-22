#!/usr/bin/env node

import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { setGlobalDispatcher, ProxyAgent } from 'undici'
import type { ILLMProvider } from './ai/runner/llm-provider.js'
import { AnthropicProvider } from './ai/runner/anthropic-provider.js'
import { GeminiProvider } from './ai/runner/gemini-provider.js'
import { TUIApp } from './interface/tui.js'

// ============================================================
// Config Loading: ~/.config/lorecraft/.env → project .env → env vars
// ============================================================

function loadConfig(): void {
  // Priority 1: XDG_CONFIG_HOME or ~/.config/lorecraft/.env
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
  const globalEnv = join(xdgConfig, 'lorecraft', '.env')

  if (existsSync(globalEnv)) {
    config({ path: globalEnv })
    return
  }

  // Priority 2: project root .env (fallback)
  config()
}

loadConfig()

// ============================================================
// Proxy Setup: make Node.js fetch respect http_proxy / https_proxy
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
  const providerName = process.env.LLM_PROVIDER?.toLowerCase() ?? 'auto'

  if (providerName === 'gemini' || providerName === 'google') {
    return new GeminiProvider(
      process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
      process.env.GEMINI_MODEL,
    )
  }

  if (providerName === 'anthropic' || providerName === 'claude') {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      console.error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic')
      process.exit(1)
    }
    return new AnthropicProvider({ apiKey: key, model: process.env.ANTHROPIC_MODEL })
  }

  // Auto-detect based on available API keys
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return new GeminiProvider()
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
    })
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
  console.error('  GEMINI_API_KEY    (Google Gemini)')
  console.error('  ANTHROPIC_API_KEY (Anthropic Claude)')
  process.exit(1)
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  const provider = createProvider()
  const app = new TUIApp(provider)
  await app.start()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
