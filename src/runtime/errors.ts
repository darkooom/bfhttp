export class BfHttpProtocolError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'BfHttpProtocolError'
  }
}

export class RequestBodyTooLargeError extends Error {
  public constructor(public readonly limit: number) {
    super(`Request body exceeds the ${limit} byte limit`)
    this.name = 'RequestBodyTooLargeError'
  }
}
