import { PromptRegistry } from './prompt-registry.js'

let _prompts: PromptRegistry | null = null

export function initPrompts(registry: PromptRegistry): void {
  _prompts = registry
}

/** Shared prompt registry — must call initPrompts() before use */
export const prompts = new Proxy({} as PromptRegistry, {
  get(_target, prop, receiver) {
    if (!_prompts) {
      throw new Error('PromptRegistry not initialized — call initPrompts() first')
    }
    const value = (_prompts as any)[prop]
    if (typeof value === 'function') {
      return value.bind(_prompts)
    }
    return value
  },
})
