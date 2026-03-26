// Vite env types
interface ImportMetaEnv {
  readonly VITE_WS_PORT?: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
