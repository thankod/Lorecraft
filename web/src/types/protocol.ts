export type ClientMessage =
  | { type: 'initialize' }
  | { type: 'input'; text: string }
  | { type: 'save' }
  | { type: 'ping' }

export type ServerMessage =
  | { type: 'narrative'; text: string; source: string }
  | { type: 'voices'; voices: Array<{ trait_id: string; line: string }> }
  | { type: 'status'; location: string; turn: number }
  | { type: 'error'; message: string }
  | { type: 'init_progress'; step: string }
  | { type: 'init_complete'; doc: any }
  | { type: 'save_result'; saveId: string }
  | { type: 'save_error'; message: string }
  | { type: 'pong' }
