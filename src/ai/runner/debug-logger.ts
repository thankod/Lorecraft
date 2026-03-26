export interface IDebugLogger {
  write(text: string): void
  append(text: string): void
}

export class NullDebugLogger implements IDebugLogger {
  write(): void {}
  append(): void {}
}
