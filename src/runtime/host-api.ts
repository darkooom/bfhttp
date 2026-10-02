import { DEFAULT_CONTENT_TYPE, HOST_BUFFER_START } from '../protocol/constants.js'
import { MemoryAddress, readBytes, readString, readUint16, writeBytes, writeUint16 } from '../protocol/memory-layout.js'
import { HostCommand } from '../protocol/opcodes.js'
import type { BrainfuckHostCall } from '../interpreter/types.js'
import { BfHttpProtocolError } from './errors.js'
import type { BfHttpRequest, BfHttpResponse } from './types.js'

const FORBIDDEN_HEADERS = new Set(['connection', 'content-length', 'transfer-encoding'])

export interface HostController {
  readonly call: BrainfuckHostCall
  finish(standardOutput: Uint8Array): BfHttpResponse
}

export function createHostController(request: BfHttpRequest): HostController {
  let status = 200
  let body: Uint8Array = new Uint8Array()
  let bodyWasSet = false
  let sent = false
  const headers = new Map<string, string>([['content-type', DEFAULT_CONTENT_TYPE]])

  const call: BrainfuckHostCall = ({ memory }) => {
    const command = memory[MemoryAddress.COMMAND] ?? HostCommand.NONE
    memory[MemoryAddress.COMMAND_STATUS] = 0

    switch (command) {
      case HostCommand.NONE:
        break
      case HostCommand.SET_STATUS: {
        const nextStatus = readUint16(memory, MemoryAddress.RESPONSE_STATUS)
        if (nextStatus < 100 || nextStatus > 599) throw new BfHttpProtocolError(`Invalid HTTP status ${nextStatus}`)
        status = nextStatus
        memory[MemoryAddress.COMMAND_STATUS] = 1
        break
      }
      case HostCommand.SET_BODY: {
        const pointer = readUint16(memory, MemoryAddress.RESPONSE_BODY_PTR)
        const length = readUint16(memory, MemoryAddress.RESPONSE_BODY_LEN)
        body = readBytes(memory, pointer, length)
        bodyWasSet = true
        memory[MemoryAddress.COMMAND_STATUS] = 1
        break
      }
      case HostCommand.SET_HEADER: {
        const pointer = readUint16(memory, MemoryAddress.HEADER_PTR)
        const length = readUint16(memory, MemoryAddress.HEADER_LEN)
        const line = readString(memory, pointer, length)
        const separator = line.indexOf(':')
        if (separator <= 0) throw new BfHttpProtocolError('Headers must use the "Name: Value" format')
        const name = line.slice(0, separator).trim().toLowerCase()
        const value = line.slice(separator + 1).trim()
        if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(value)) {
          throw new BfHttpProtocolError('Invalid response header')
        }
        if (FORBIDDEN_HEADERS.has(name)) throw new BfHttpProtocolError(`Header ${name} is controlled by the runtime`)
        headers.set(name, value)
        memory[MemoryAddress.COMMAND_STATUS] = 1
        break
      }
      case HostCommand.SEND_RESPONSE:
        sent = true
        memory[MemoryAddress.COMMAND_STATUS] = 1
        break
      case HostCommand.READ_REQUEST_BODY:
        body = request.body.slice()
        bodyWasSet = true
        memory[MemoryAddress.COMMAND_STATUS] = 1
        break
      case HostCommand.READ_QUERY: {
        const keyPointer = readUint16(memory, MemoryAddress.ARGUMENT_PTR)
        const keyLength = readUint16(memory, MemoryAddress.ARGUMENT_LEN)
        const key = readString(memory, keyPointer, keyLength)
        const value = new URLSearchParams(request.query).get(key)
        if (value !== null) {
          const encoded = new TextEncoder().encode(value)
          const configuredPointer = readUint16(memory, MemoryAddress.RESPONSE_BODY_PTR)
          const prefixLength = readUint16(memory, MemoryAddress.RESPONSE_BODY_LEN)
          const destination = configuredPointer === 0 ? HOST_BUFFER_START : configuredPointer
          if (destination + prefixLength + encoded.length >= memory.length) throw new BfHttpProtocolError('Query value is too large for the host buffer')
          writeBytes(memory, destination + prefixLength, encoded)
          memory[destination + prefixLength + encoded.length] = 0
          writeUint16(memory, MemoryAddress.ARGUMENT_PTR, destination + prefixLength)
          writeUint16(memory, MemoryAddress.ARGUMENT_LEN, encoded.length)
          writeUint16(memory, MemoryAddress.RESPONSE_BODY_PTR, destination)
          writeUint16(memory, MemoryAddress.RESPONSE_BODY_LEN, prefixLength + encoded.length)
          memory[MemoryAddress.COMMAND_STATUS] = 1
        }
        break
      }
      case HostCommand.MATCH_ROUTE: {
        const pointer = readUint16(memory, MemoryAddress.ARGUMENT_PTR)
        const length = readUint16(memory, MemoryAddress.ARGUMENT_LEN)
        memory[MemoryAddress.COMMAND_STATUS] = readString(memory, pointer, length) === `${request.method} ${request.path}` ? 1 : 0
        break
      }
      default:
        throw new BfHttpProtocolError(`Unknown host command ${command}`)
    }

    memory[MemoryAddress.COMMAND] = HostCommand.NONE
  }

  return {
    call,
    finish(standardOutput) {
      if (!sent) return { status: 204, headers: {}, body: new Uint8Array(), sent: false }
      return {
        status,
        headers: Object.fromEntries(headers),
        body: bodyWasSet ? body : standardOutput,
        sent: true,
      }
    },
  }
}
