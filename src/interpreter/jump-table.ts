import { BrainfuckSyntaxError } from './errors.js'
import type { ParsedProgram } from './types.js'

export function buildJumpTable(program: ParsedProgram): ReadonlyMap<number, number> {
  const jumps = new Map<number, number>()
  const stack: number[] = []

  for (let index = 0; index < program.instructions.length; index += 1) {
    const instruction = program.instructions[index]
    if (instruction === '[') {
      stack.push(index)
    } else if (instruction === ']') {
      const opening = stack.pop()
      if (opening === undefined) {
        throw new BrainfuckSyntaxError('Unmatched closing bracket', program.sourceOffsets[index] ?? index)
      }
      jumps.set(opening, index)
      jumps.set(index, opening)
    }
  }

  const unmatched = stack.pop()
  if (unmatched !== undefined) {
    throw new BrainfuckSyntaxError('Unmatched opening bracket', program.sourceOffsets[unmatched] ?? unmatched)
  }

  return jumps
}
