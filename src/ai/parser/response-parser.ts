import type { z } from 'zod/v4'
import { extractJson } from './json-extraction.js'

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
    const json = extractJson(raw)

    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return {
        success: false,
        error: {
          type: 'INVALID_JSON',
          message: `Failed to parse JSON (raw ${raw.length} chars, extracted ${json.length} chars): ${json.slice(0, 200) || '<empty>'}`,
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

}
