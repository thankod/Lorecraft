import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPromptsFromDirectory } from './ai/prompt/prompt-loader.js'
import { initPrompts } from './ai/prompt/prompts.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const promptsDir = join(__dirname, '..', 'prompts')
initPrompts(loadPromptsFromDirectory(promptsDir))
