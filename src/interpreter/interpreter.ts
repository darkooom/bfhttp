import { BrainfuckExecutionLimitError, BrainfuckRuntimeError } from './errors.js'
import { buildJumpTable } from './jump-table.js'
import { BrainfuckMemory } from './memory.js'
import { parseBrainfuck } from './parser.js'
import type { BrainfuckExecutionOptions, BrainfuckExecutionResult } from './types.js'

export const DEFAULT_MAX_INSTRUCTIONS = 10_000_000

export class BrainfuckInterpreter {
  public run(source: string, options: BrainfuckExecutionOptions = {}): BrainfuckExecutionResult {
    const program = parseBrainfuck(source, options.extended)
    const jumps = buildJumpTable(program)
    const memory = new BrainfuckMemory(options.memorySize, options.initialMemory)
    const input = options.input ?? new Uint8Array()
    const output: number[] = []
    const maxInstructions = options.maxInstructions ?? DEFAULT_MAX_INSTRUCTIONS
    const startedAt = Date.now()
    let inputIndex = 0
    let instructionsExecuted = 0

    if (!Number.isSafeInteger(maxInstructions) || maxInstructions <= 0) {
      throw new BrainfuckRuntimeError('maxInstructions must be a positive integer')
    }

    for (let pc = 0; pc < program.instructions.length; pc += 1) {
      if (instructionsExecuted >= maxInstructions) {
        throw new BrainfuckExecutionLimitError(maxInstructions)
      }
      if (options.timeoutMs !== undefined && Date.now() - startedAt >= options.timeoutMs) {
        throw new BrainfuckRuntimeError(`Brainfuck execution timed out after ${options.timeoutMs}ms`)
      }

      instructionsExecuted += 1
      const instruction = program.instructions[pc]

      switch (instruction) {
        case '>': memory.moveRight(); break
        case '<': memory.moveLeft(); break
        case '+': memory.value += 1; break
        case '-': memory.value -= 1; break
        case '.': output.push(memory.value); break
        case ',':
          memory.value = input[inputIndex] ?? 0
          inputIndex += 1
          break
        case '[':
          if (memory.value === 0) pc = requiredJump(jumps, pc)
          break
        case ']':
          if (memory.value !== 0) pc = requiredJump(jumps, pc)
          break
        case '!':
          if (options.hostCall === undefined) {
            throw new BrainfuckRuntimeError('Host call instruction used without a hostCall handler')
          }
          options.hostCall({ memory: memory.cells, pointer: memory.pointer, instructionsExecuted })
          break
      }
    }

    return {
      output: Uint8Array.from(output),
      memory: memory.cells,
      pointer: memory.pointer,
      instructionsExecuted,
    }
  }
}

function requiredJump(jumps: ReadonlyMap<number, number>, pc: number): number {
  const target = jumps.get(pc)
  if (target === undefined) throw new BrainfuckRuntimeError(`Missing jump target for instruction ${pc}`)
  return target
}
