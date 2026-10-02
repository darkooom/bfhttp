import type { ServerResponse } from 'node:http'
import type { BfHttpResponse } from './types.js'

export function writeHttpResponse(target: ServerResponse, response: BfHttpResponse): void {
  target.statusCode = response.status
  for (const [name, value] of Object.entries(response.headers)) target.setHeader(name, value)
  target.end(response.body)
}

export function writeErrorResponse(target: ServerResponse, status: number, message: string): void {
  target.statusCode = status
  target.setHeader('content-type', 'text/plain; charset=utf-8')
  target.end(message)
}
