import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

export class PromptRegistry {
  private templates = new Map<string, string>()

  constructor(directory: string) {
    this.loadFromDirectory(directory)
  }

  get(name: string): string {
    const template = this.templates.get(name)
    if (!template) {
      throw new Error(`Prompt template not found: ${name}`)
    }
    return template
  }

  /**
   * Fill a prompt template with variables. Unfilled {{placeholders}} are removed
   * along with their surrounding blank lines to keep the output clean.
   */
  fill(name: string, variables: Record<string, string>): string {
    let template = this.get(name)
    for (const [key, value] of Object.entries(variables)) {
      template = template.replaceAll(`{{${key}}}`, value)
    }
    // Remove lines that are only unfilled placeholders (optional dynamic parts)
    template = template
      .split('\n')
      .filter((line) => !/^\s*\{\{[a-z_]+\}\}\s*$/.test(line))
      .join('\n')
    // Collapse 3+ consecutive newlines into 2
    template = template.replace(/\n{3,}/g, '\n\n')
    return template.trim()
  }

  has(name: string): boolean {
    return this.templates.has(name)
  }

  names(): string[] {
    return [...this.templates.keys()]
  }

  private loadFromDirectory(directory: string): void {
    const files = readdirSync(directory).filter((f) => f.endsWith('.prompt'))
    for (const file of files) {
      const name = basename(file, '.prompt')
      const content = readFileSync(join(directory, file), 'utf-8')
      this.templates.set(name, content)
    }
  }
}
