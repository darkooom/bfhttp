import type { ParsedProgram } from './types.js'

const STANDARD_INSTRUCTIONS = new Set(['>', '<', '+', '-', '.', ',', '[', ']'])

export function parseBrainfuck(source: string, extended = false): ParsedProgram {
  const instructions: string[] = []
  const sourceOffsets: number[] = []

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character !== undefined && (STANDARD_INSTRUCTIONS.has(character) || (extended && character === '!'))) {
      instructions.push(character)
      sourceOffsets.push(index)
    }
  }

  return { instructions: instructions.join(''), sourceOffsets }
}
