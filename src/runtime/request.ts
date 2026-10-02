import type { IncomingMessage } from 'node:http'
import { BFHTTP_MEMORY_SIZE, DATA_START, HOST_BUFFER_START } from '../protocol/constants.js'
import { MemoryAddress, writeBytes, writeUint16 } from '../protocol/memory-layout.js'
import { encodeHttpMethod } from '../protocol/opcodes.js'
import { BfHttpProtocolError, RequestBodyTooLargeError } from './errors.js'
import type { BfHttpRequest } from './types.js'

export async function readHttpRequest(request: IncomingMessage, bodyLimit: number): Promise<BfHttpRequest> {
  const body = await readBody(request, bodyLimit)
  const url = new URL(request.url ?? '/', 'http://bfhttp.local')
  return {
    method: request.method?.toUpperCase() ?? 'GET',
    path: url.pathname,
    query: url.searchParams.toString(),
    body,
  }
}

export function createRequestMemory(request: BfHttpRequest): Uint8Array {
  const memory = new Uint8Array(BFHTTP_MEMORY_SIZE)
  memory[MemoryAddress.METHOD] = encodeHttpMethod(request.method)
  let cursor = DATA_START

  cursor = writeField(memory, MemoryAddress.REQUEST_PATH_PTR, MemoryAddress.REQUEST_PATH_LEN, cursor, new TextEncoder().encode(request.path))
  cursor = writeField(memory, MemoryAddress.QUERY_PTR, MemoryAddress.QUERY_LEN, cursor, new TextEncoder().encode(request.query))

  if (cursor + request.body.length < HOST_BUFFER_START) {
    writeField(memory, MemoryAddress.REQUEST_BODY_PTR, MemoryAddress.REQUEST_BODY_LEN, cursor, request.body)
  } else {
    writeUint16(memory, MemoryAddress.REQUEST_BODY_PTR, 0)
    writeUint16(memory, MemoryAddress.REQUEST_BODY_LEN, 0)
    memory[MemoryAddress.FLAGS] = (memory[MemoryAddress.FLAGS] ?? 0) | 1
  }

  return memory
}

function writeField(memory: Uint8Array, pointerAddress: number, lengthAddress: number, cursor: number, value: Uint8Array): number {
  if (value.length > 0xffff || cursor + value.length >= HOST_BUFFER_START) {
    throw new BfHttpProtocolError('Request metadata does not fit in the bfhttp data area')
  }
  writeUint16(memory, pointerAddress, cursor)
  writeUint16(memory, lengthAddress, value.length)
  writeBytes(memory, cursor, value)
  return cursor + value.length + 1
}

async function readBody(request: IncomingMessage, limit: number): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > limit) throw new RequestBodyTooLargeError(limit)
    chunks.push(buffer)
  }

  return Buffer.concat(chunks)
}
