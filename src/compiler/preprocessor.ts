import { generateBrainfuck } from './generator.js'
import { parseBfh } from './parser.js'

export function compileBfh(source: string): string {
  return generateBrainfuck(parseBfh(source))
}
