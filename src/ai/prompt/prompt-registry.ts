export class PromptRegistry {
  private templates = new Map<string, string>()

  constructor(templates: Map<string, string> | Record<string, string>) {
    if (templates instanceof Map) {
      this.templates = templates
    } else {
      for (const [key, value] of Object.entries(templates)) {
        this.templates.set(key, value)
      }
    }
  }

  /** Browser-friendly: create from Vite import.meta.glob result or plain record */
  static fromRecord(modules: Record<string, string>): PromptRegistry {
    const map = new Map<string, string>()
    for (const [path, content] of Object.entries(modules)) {
      // Extract name from path like '../../../prompts/foo.prompt' → 'foo'
      const name = path.split('/').pop()!.replace('.prompt', '')
      map.set(name, content)
    }
    return new PromptRegistry(map)
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
}
