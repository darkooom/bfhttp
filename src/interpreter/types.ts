export interface BrainfuckHostContext {
  readonly memory: Uint8Array
  readonly pointer: number
  readonly instructionsExecuted: number
}

export type BrainfuckHostCall = (context: BrainfuckHostContext) => void

export interface BrainfuckExecutionOptions {
  readonly input?: Uint8Array
  readonly maxInstructions?: number
  readonly timeoutMs?: number
  readonly memorySize?: number
  readonly initialMemory?: Uint8Array
  readonly extended?: boolean
  readonly hostCall?: BrainfuckHostCall
}

export interface BrainfuckExecutionResult {
  readonly output: Uint8Array
  readonly memory: Uint8Array
  readonly pointer: number
  readonly instructionsExecuted: number
}

export interface ParsedProgram {
  readonly instructions: string
  readonly sourceOffsets: readonly number[]
}
