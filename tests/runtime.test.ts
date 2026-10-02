import { describe, expect, it } from 'vitest'
import { compileBfh } from '../src/compiler/preprocessor.js'
import { HostCommand } from '../src/protocol/opcodes.js'
import { BfHttpRuntime } from '../src/runtime/runtime.js'

const request = {
  method: 'GET',
  path: '/',
  query: '',
  body: new Uint8Array(),
} as const

describe('BfHttpRuntime', () => {
  it('uses the extended host API to construct a response', () => {
    const source = compileBfh(`
      @status 201
      @header X-Bfhttp yes
      @body "created"
      @send
    `)
    const response = new BfHttpRuntime().execute(source, request)
    expect(response.status).toBe(201)
    expect(response.headers['x-bfhttp']).toBe('yes')
    expect(new TextDecoder().decode(response.body)).toBe('created')
  })

  it('returns 204 when the program does not send', () => {
    expect(new BfHttpRuntime().execute('+.', request)).toMatchObject({ status: 204, sent: false })
  })

  it('can echo a request body through a whitelisted command', () => {
    const source = '+'.repeat(HostCommand.READ_REQUEST_BODY) + '!' + '+'.repeat(HostCommand.SEND_RESPONSE) + '!'
    const response = new BfHttpRuntime().execute(source, { ...request, method: 'POST', body: new TextEncoder().encode('hello') })
    expect(new TextDecoder().decode(response.body)).toBe('hello')
  })

  it('keeps VM memory isolated between requests', () => {
    const source = '+'.repeat(HostCommand.SEND_RESPONSE) + '!'
    const runtime = new BfHttpRuntime()
    expect(runtime.execute(source, request)).toEqual(runtime.execute(source, request))
  })
})
