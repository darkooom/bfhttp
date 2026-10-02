import type { BfhAction, BfhProgram, BfhRoute } from './types.js'

export class BfhSyntaxError extends Error {
  public constructor(message: string, public readonly line: number) {
    super(`${message} at line ${line}`)
    this.name = 'BfhSyntaxError'
  }
}

export function parseBfh(source: string): BfhProgram {
  const routes: BfhRoute[] = []
  let current: { method?: string; path?: string; actions: BfhAction[] } = { actions: [] }

  const commit = (): void => {
    if (current.actions.length > 0 || current.method !== undefined) routes.push(current)
  }

  for (const [index, originalLine] of source.split(/\r?\n/u).entries()) {
    const lineNumber = index + 1
    const line = originalLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const space = line.indexOf(' ')
    const directive = space === -1 ? line : line.slice(0, space)
    const argument = space === -1 ? '' : line.slice(space + 1).trim()

    if (directive === '@route') {
      commit()
      const match = /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\/\S*)$/u.exec(argument)
      if (match?.[1] === undefined || match[2] === undefined) throw new BfhSyntaxError('Expected @route METHOD /path', lineNumber)
      current = { method: match[1], path: match[2], actions: [] }
      continue
    }

    current.actions.push(parseAction(directive, argument, lineNumber))
  }

  commit()
  if (routes.length === 0) throw new BfhSyntaxError('Program does not contain any directives', 1)
  return { routes }
}

function parseAction(directive: string, argument: string, line: number): BfhAction {
  switch (directive) {
    case '@status': {
      const value = Number(argument)
      if (!Number.isInteger(value) || value < 100 || value > 599) throw new BfhSyntaxError('Status must be between 100 and 599', line)
      return { type: 'status', value }
    }
    case '@body':
      return { type: 'body', value: parseText(argument, line) }
    case '@header': {
      const match = /^(\S+)\s+(.+)$/u.exec(argument)
      if (match?.[1] === undefined || match[2] === undefined) throw new BfhSyntaxError('Expected @header NAME VALUE', line)
      return { type: 'header', name: match[1], value: parseText(match[2], line) }
    }
    case '@send':
      if (argument !== '') throw new BfhSyntaxError('@send does not accept an argument', line)
      return { type: 'send' }
    default:
      throw new BfhSyntaxError(`Unknown directive ${directive}`, line)
  }
}

function parseText(value: string, line: number): string {
  if (value.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (typeof parsed !== 'string') throw new Error('not a string')
      return parsed
    } catch {
      throw new BfhSyntaxError('Expected a valid quoted string', line)
    }
  }
  if (value === '') throw new BfhSyntaxError('Expected text', line)
  return value
}
