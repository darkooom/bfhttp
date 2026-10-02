export const MemoryAddress = {
  COMMAND: 0,
  COMMAND_STATUS: 1,
  METHOD: 2,
  FLAGS: 3,
  RESPONSE_STATUS: 4,
  REQUEST_PATH_PTR: 10,
  REQUEST_PATH_LEN: 12,
  REQUEST_BODY_PTR: 14,
  REQUEST_BODY_LEN: 16,
  RESPONSE_BODY_PTR: 18,
  RESPONSE_BODY_LEN: 20,
  QUERY_PTR: 22,
  QUERY_LEN: 24,
  HEADER_PTR: 26,
  HEADER_LEN: 28,
  ARGUMENT_PTR: 30,
  ARGUMENT_LEN: 32,
} as const

export function readUint16(memory: Uint8Array, address: number): number {
  assertRange(memory, address, 2)
  return (memory[address] ?? 0) | ((memory[address + 1] ?? 0) << 8)
}

export function writeUint16(memory: Uint8Array, address: number, value: number): void {
  assertUint16(value)
  assertRange(memory, address, 2)
  memory[address] = value & 0xff
  memory[address + 1] = value >>> 8
}

export function readBytes(memory: Uint8Array, pointer: number, length: number): Uint8Array {
  assertRange(memory, pointer, length)
  return memory.slice(pointer, pointer + length)
}

export function writeBytes(memory: Uint8Array, pointer: number, value: Uint8Array): void {
  assertRange(memory, pointer, value.length)
  memory.set(value, pointer)
}

export function readString(memory: Uint8Array, pointer: number, length: number): string {
  return new TextDecoder().decode(readBytes(memory, pointer, length))
}

export function writeString(memory: Uint8Array, pointer: number, value: string): number {
  const encoded = new TextEncoder().encode(value)
  writeBytes(memory, pointer, encoded)
  return encoded.length
}

function assertUint16(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`Value ${value} does not fit in an unsigned 16-bit integer`)
  }
}

function assertRange(memory: Uint8Array, pointer: number, length: number): void {
  if (!Number.isInteger(pointer) || !Number.isInteger(length) || pointer < 0 || length < 0 || pointer + length > memory.length) {
    throw new RangeError(`Memory range ${pointer}..${pointer + length} is out of bounds`)
  }
}
