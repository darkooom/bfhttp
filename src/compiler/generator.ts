import { DATA_START } from '../protocol/constants.js'
import { MemoryAddress } from '../protocol/memory-layout.js'
import { HostCommand } from '../protocol/opcodes.js'
import type { BfhAction, BfhProgram } from './types.js'

export function generateBrainfuck(program: BfhProgram): string {
  const builder = new BrainfuckBuilder()

  for (const route of program.routes) {
    if (route.method !== undefined && route.path !== undefined) {
      const routeValue = `${route.method} ${route.path}`
      const location = builder.store(routeValue)
      builder.uint16(MemoryAddress.ARGUMENT_PTR, location.pointer)
      builder.uint16(MemoryAddress.ARGUMENT_LEN, location.length)
      builder.host(HostCommand.MATCH_ROUTE)
      builder.move(MemoryAddress.COMMAND_STATUS)
      builder.raw('[')
      for (const action of route.actions) emitAction(builder, action)
      builder.move(MemoryAddress.COMMAND_STATUS)
      builder.raw('[-]]')
    } else {
      for (const action of route.actions) emitAction(builder, action)
    }
  }

  return builder.finish()
}

function emitAction(builder: BrainfuckBuilder, action: BfhAction): void {
  switch (action.type) {
    case 'status':
      builder.uint16(MemoryAddress.RESPONSE_STATUS, action.value)
      builder.host(HostCommand.SET_STATUS)
      break
    case 'body': {
      const location = builder.store(action.value)
      builder.uint16(MemoryAddress.RESPONSE_BODY_PTR, location.pointer)
      builder.uint16(MemoryAddress.RESPONSE_BODY_LEN, location.length)
      builder.host(HostCommand.SET_BODY)
      break
    }
    case 'header': {
      const location = builder.store(`${action.name}: ${action.value}`)
      builder.uint16(MemoryAddress.HEADER_PTR, location.pointer)
      builder.uint16(MemoryAddress.HEADER_LEN, location.length)
      builder.host(HostCommand.SET_HEADER)
      break
    }
    case 'send':
      builder.host(HostCommand.SEND_RESPONSE)
      break
  }
}

class BrainfuckBuilder {
  private readonly parts: string[] = []
  private pointer = 0
  private dataCursor = DATA_START

  public raw(value: string): void {
    this.parts.push(value)
  }

  public move(target: number): void {
    const difference = target - this.pointer
    this.parts.push(difference >= 0 ? '>'.repeat(difference) : '<'.repeat(-difference))
    this.pointer = target
  }

  public cell(address: number, value: number): void {
    this.move(address)
    const normalized = value & 0xff
    this.parts.push('[-]')
    this.parts.push(normalized <= 128 ? '+'.repeat(normalized) : '-'.repeat(256 - normalized))
  }

  public uint16(address: number, value: number): void {
    this.cell(address, value & 0xff)
    this.cell(address + 1, value >>> 8)
  }

  public store(value: string): { pointer: number; length: number } {
    const bytes = new TextEncoder().encode(value)
    const pointer = this.dataCursor
    for (const [offset, byte] of bytes.entries()) this.cell(pointer + offset, byte)
    this.dataCursor += bytes.length + 1
    return { pointer, length: bytes.length }
  }

  public host(command: HostCommand): void {
    this.cell(MemoryAddress.COMMAND, command)
    this.parts.push('!')
  }

  public finish(): string {
    return this.parts.join('')
  }
}
