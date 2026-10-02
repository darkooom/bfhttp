export interface BfHttpRequest {
  readonly method: string
  readonly path: string
  readonly query: string
  readonly body: Uint8Array
}

export interface BfHttpResponse {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly body: Uint8Array
  readonly sent: boolean
}

export interface RuntimeOptions {
  readonly maxInstructions?: number
  readonly timeoutMs?: number
  readonly development?: boolean
}

export interface ServerOptions extends RuntimeOptions {
  readonly host?: string
  readonly port?: number
  readonly bodyLimit?: number
  readonly logger?: ((message: string) => void) | false
}
