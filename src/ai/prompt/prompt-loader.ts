import { readdirSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { PromptRegistry } from './prompt-registry.js'

/** Node-only: load all .prompt files from a directory */
export function loadPromptsFromDirectory(directory: string): PromptRegistry {
  const map = new Map<string, string>()
  const files = readdirSync(directory).filter((f: string) => f.endsWith('.prompt'))
  for (const file of files) {
    const name = basename(file, '.prompt')
    const content = readFileSync(join(directory, file), 'utf-8')
    map.set(name, content)
  }
  return new PromptRegistry(map)
}
