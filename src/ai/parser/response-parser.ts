import type { z } from 'zod/v4'

export interface ParseError {
  type: 'INVALID_JSON' | 'SCHEMA_VIOLATION' | 'ENUM_VIOLATION'
  message: string
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ParseError }

export class ResponseParser<T> {
  private schema: z.ZodType<T>

  constructor(schema: z.ZodType<T>) {
    this.schema = schema
  }

  parse(raw: string): ParseResult<T> {
    const json = this.extractJson(raw)

    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return {
        success: false,
        error: {
          type: 'INVALID_JSON',
          message: `Failed to parse JSON: ${json.slice(0, 200)}`,
        },
      }
    }

    const result = this.schema.safeParse(parsed)

    if (result.success) {
      return { success: true, data: result.data }
    }

    const issue = result.error.issues[0]
    const isEnum =
      issue && (issue as unknown as Record<string, unknown>).code === 'invalid_value'

    return {
      success: false,
      error: {
        type: isEnum ? 'ENUM_VIOLATION' : 'SCHEMA_VIOLATION',
        message: result.error.issues
          .map((i) => `${i.path.map(String).join('.')}: ${i.message}`)
          .join('; '),
      },
    }
  }

  getRetryHint(error: ParseError): string {
    switch (error.type) {
      case 'INVALID_JSON':
        return 'Your previous output was not valid JSON. Please respond with only valid JSON.'
      case 'SCHEMA_VIOLATION':
        return `Schema validation failed: ${error.message}. Please ensure all required fields are present and correctly typed.`
      case 'ENUM_VIOLATION':
        return `Enum validation failed: ${error.message}. Please use only the allowed values.`
    }
  }

  private extractJson(raw: string): string {
    // Try to extract from ```json ... ``` code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // Try to find a JSON object or array directly
    const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (jsonMatch) {
      return jsonMatch[1]
    }

    // Return raw as-is, let JSON.parse handle the error
    return raw.trim()
  }
}
