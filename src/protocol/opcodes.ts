export enum HostCommand {
  NONE = 0,
  SET_STATUS = 1,
  SET_BODY = 2,
  SET_HEADER = 3,
  SEND_RESPONSE = 4,
  READ_REQUEST_BODY = 5,
  READ_QUERY = 6,
  MATCH_ROUTE = 7,
}

export enum HttpMethod {
  UNKNOWN = 0,
  GET = 1,
  POST = 2,
  PUT = 3,
  PATCH = 4,
  DELETE = 5,
  OPTIONS = 6,
  HEAD = 7,
}

export function encodeHttpMethod(method: string | undefined): HttpMethod {
  switch (method?.toUpperCase()) {
    case 'GET': return HttpMethod.GET
    case 'POST': return HttpMethod.POST
    case 'PUT': return HttpMethod.PUT
    case 'PATCH': return HttpMethod.PATCH
    case 'DELETE': return HttpMethod.DELETE
    case 'OPTIONS': return HttpMethod.OPTIONS
    case 'HEAD': return HttpMethod.HEAD
    default: return HttpMethod.UNKNOWN
  }
}
