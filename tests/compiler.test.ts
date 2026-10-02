import { describe, expect, it } from 'vitest'
import { compileBfh } from '../src/compiler/preprocessor.js'
import { BfhSyntaxError } from '../src/compiler/parser.js'
import { BfHttpRuntime } from '../src/runtime/runtime.js'

describe('bfhttp preprocessor', () => {
  it('compiles route, status, headers, body, and send', () => {
    const source = compileBfh(`
      @route GET /
      @status 200
      @header Content-Type application/json
      @body "{\\"ok\\":true}"
      @send
    `)
    const response = new BfHttpRuntime().execute(source, { method: 'GET', path: '/', query: '', body: new Uint8Array() })
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(new TextDecoder().decode(response.body)).toBe('{"ok":true}')
  })

  it('does not run actions when a route does not match', () => {
    const source = compileBfh('@route POST /submit\n@body "ok"\n@send')
    expect(new BfHttpRuntime().execute(source, { method: 'GET', path: '/', query: '', body: new Uint8Array() }).status).toBe(204)
  })

  it('rejects unknown directives', () => {
    expect(() => compileBfh('@unknown value')).toThrow(BfhSyntaxError)
  })
})
