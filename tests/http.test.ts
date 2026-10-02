import { afterEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { compileBfh } from '../src/compiler/preprocessor.js'
import { HostCommand } from '../src/protocol/opcodes.js'
import { startBfHttpServer, type RunningBfHttpServer } from '../src/runtime/server.js'

let running: RunningBfHttpServer | undefined

afterEach(async () => {
  await running?.close()
  running = undefined
})

describe('HTTP server', () => {
  it('serves GET /', async () => {
    running = await startBfHttpServer(compileBfh('@route GET /\n@body "Hello from Brainfuck!"\n@send'), { port: 0, logger: false })
    const response = await fetch(running.url)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Hello from Brainfuck!')
  })

  it('echoes POST bodies', async () => {
    const source = '+'.repeat(HostCommand.READ_REQUEST_BODY) + '!' + '+'.repeat(HostCommand.SEND_RESPONSE) + '!'
    running = await startBfHttpServer(source, { port: 0, logger: false })
    const response = await fetch(`${running.url}/echo`, { method: 'POST', body: 'hello' })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('hello')
  })

  it('reads query parameters through the ABI', async () => {
    const source = await readFile(new URL('../examples/query.bf', import.meta.url), 'utf8')
    running = await startBfHttpServer(source, { port: 0, logger: false })
    const response = await fetch(`${running.url}/hello?name=Darko`)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Hello Darko')
  })

  it.each([
    ['darko:1234', 200, 'Login successful'],
    ['wrong', 401, 'Invalid credentials'],
  ])('runs login decisions in Brainfuck for %s', async (body, status, expected) => {
    const source = await readFile(new URL('../examples/login.bf', import.meta.url), 'utf8')
    running = await startBfHttpServer(source, { port: 0, logger: false })
    const response = await fetch(`${running.url}/login`, { method: 'POST', body })
    expect(response.status).toBe(status)
    expect(await response.text()).toBe(expected)
  })

  it('returns 500 for invalid Brainfuck', async () => {
    running = await startBfHttpServer('[', { port: 0, logger: false })
    const response = await fetch(running.url)
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal Server Error')
  })

  it('enforces the request body limit', async () => {
    running = await startBfHttpServer('', { port: 0, bodyLimit: 3, logger: false })
    const response = await fetch(running.url, { method: 'POST', body: 'large' })
    expect(response.status).toBe(413)
  })
})
