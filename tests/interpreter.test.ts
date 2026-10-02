import { describe, expect, it, vi } from 'vitest'
import {
  BrainfuckExecutionLimitError,
  BrainfuckInterpreter,
  BrainfuckMemoryError,
  BrainfuckSyntaxError,
  parseBrainfuck,
} from '../src/interpreter/index.js'

const decoder = new TextDecoder()

describe('BrainfuckInterpreter', () => {
  it('executes arithmetic, pointer moves, output, and ignores comments', () => {
    const result = new BrainfuckInterpreter().run('++ > +++ ignored < . > .')
    expect([...result.output]).toEqual([2, 3])
    expect(result.pointer).toBe(1)
  })

  it('reads input and returns zero after EOF', () => {
    const result = new BrainfuckInterpreter().run(',.,.', {
      input: new TextEncoder().encode('A'),
    })
    expect([...result.output]).toEqual([65, 0])
  })

  it('uses Uint8 overflow and underflow', () => {
    const result = new BrainfuckInterpreter().run('-.+.')
    expect([...result.output]).toEqual([255, 0])
  })

  it('executes nested loops using precomputed jumps', () => {
    const result = new BrainfuckInterpreter().run('++[>++[>+++<-]<-]>>.')
    expect([...result.output]).toEqual([12])
  })

  it('runs a standard Hello World program', () => {
    const source = '++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.'
    expect(decoder.decode(new BrainfuckInterpreter().run(source).output)).toBe('Hello World!\n')
  })

  it.each(['[', ']'])('rejects malformed loop %s', (source) => {
    expect(() => new BrainfuckInterpreter().run(source)).toThrow(BrainfuckSyntaxError)
  })

  it('prevents a negative pointer', () => {
    expect(() => new BrainfuckInterpreter().run('<')).toThrow(BrainfuckMemoryError)
  })

  it('prevents a pointer past the configured memory', () => {
    expect(() => new BrainfuckInterpreter().run('>'.repeat(30_000))).toThrow(BrainfuckMemoryError)
  })

  it('stops programs at the instruction limit', () => {
    expect(() => new BrainfuckInterpreter().run('+[]', { maxInstructions: 100 })).toThrow(BrainfuckExecutionLimitError)
  })

  it('supports the optional host-call extension', () => {
    const hostCall = vi.fn()
    const result = new BrainfuckInterpreter().run('+!', { extended: true, hostCall })
    expect(hostCall).toHaveBeenCalledOnce()
    expect(result.memory[0]).toBe(1)
  })

  it('treats ! as a comment in standard mode', () => {
    expect(parseBrainfuck('+!').instructions).toBe('+')
  })
})
