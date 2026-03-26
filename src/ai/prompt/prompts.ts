import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PromptRegistry } from './prompt-registry.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// From src/ai/prompt/ → ../../.. → project root → prompts/
// From dist/ → .. → project root → prompts/
const PROMPTS_DIR = join(__dirname, '..', '..', '..', 'prompts')

/** Shared prompt registry singleton — loaded once from prompts/ directory */
export const prompts = new PromptRegistry(PROMPTS_DIR)
