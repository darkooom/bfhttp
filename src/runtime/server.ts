import { createServer, type Server } from 'node:http'
import { DEFAULT_BODY_LIMIT, DEFAULT_PORT } from '../protocol/constants.js'
import { RequestBodyTooLargeError } from './errors.js'
import { readHttpRequest } from './request.js'
import { writeErrorResponse, writeHttpResponse } from './response.js'
import { BfHttpRuntime } from './runtime.js'
import type { ServerOptions } from './types.js'

export interface RunningBfHttpServer {
  readonly server: Server
  readonly host: string
  readonly port: number
  readonly url: string
  close(): Promise<void>
}

export async function startBfHttpServer(source: string, options: ServerOptions = {}): Promise<RunningBfHttpServer> {
  const host = options.host ?? 'localhost'
  const requestedPort = options.port ?? DEFAULT_PORT
  const bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT
  const logger = options.logger === false ? undefined : (options.logger ?? console.log)
  const runtime = new BfHttpRuntime(options)

  const server = createServer(async (nodeRequest, nodeResponse) => {
    const startedAt = performance.now()
    let logMethod = nodeRequest.method ?? 'GET'
    let logPath = nodeRequest.url ?? '/'
    let logStatus = 500

    try {
      const request = await readHttpRequest(nodeRequest, bodyLimit)
      logMethod = request.method
      logPath = request.path
      const response = runtime.execute(source, request)
      logStatus = response.status
      writeHttpResponse(nodeResponse, response)
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        logStatus = 413
        writeErrorResponse(nodeResponse, 413, 'Request body too large')
      } else {
        logStatus = 500
        const detail = options.development && error instanceof Error ? `\n${error.stack ?? error.message}` : ''
        writeErrorResponse(nodeResponse, 500, `Internal Server Error${detail}`)
      }
    } finally {
      logger?.(`${logMethod} ${logPath} ${logStatus} ${Math.max(0, Math.round(performance.now() - startedAt))}ms`)
    }
  })

  await listen(server, requestedPort, host)
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('HTTP server did not expose a TCP address')
  const displayHost = host.includes(':') ? `[${host}]` : host

  return {
    server,
    host,
    port: address.port,
    url: `http://${displayHost}:${address.port}`,
    close: () => close(server),
  }
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => reject(error)
    server.once('error', onError)
    server.listen(port, host, () => {
      server.off('error', onError)
      resolve()
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })
}
