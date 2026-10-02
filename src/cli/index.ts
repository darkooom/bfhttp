#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import process from 'node:process'
import { compileBfh } from '../compiler/preprocessor.js'
import { BrainfuckInterpreter } from '../interpreter/interpreter.js'
import { DEFAULT_MAX_INSTRUCTIONS } from '../interpreter/interpreter.js'
import { DEFAULT_PORT } from '../protocol/constants.js'
import { startBfHttpServer } from '../runtime/server.js'

const VERSION = '0.1.0'
const HELP = `bfhttp

Brainfuck HTTP Runtime

Commands:
  bfhttp run <file> [--port <number>] [--max-instructions <number>]
  bfhttp exec <file> [--max-instructions <number>]
  bfhttp compile <file> [--output <file>]

Options:
  --port <number>             HTTP port (default: 8080)
  --max-instructions <number> VM instruction limit (default: 10000000)
  --development              Include error details in HTTP 500 responses
  --help                     Show this help
  --version                  Show the version`

interface ParsedArguments {
  readonly command?: string
  readonly file?: string
  readonly port: number
  readonly maxInstructions: number
  readonly development: boolean
  readonly output?: string
  readonly help: boolean
  readonly version: boolean
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? `bfhttp: ${error.message}` : 'bfhttp: unknown error')
  process.exitCode = 1
})

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2))
  if (args.version) {
    console.log(VERSION)
    return
  }
  if (args.help || args.command === undefined) {
    console.log(HELP)
    return
  }
  if (args.file === undefined) throw new Error(`${args.command} requires a file`)

  switch (args.command) {
    case 'run':
      await runServer(args)
      break
    case 'exec':
      await executeFile(args.file, args.maxInstructions)
      break
    case 'compile':
      await compileFile(args.file, args.output)
      break
    default:
      throw new Error(`unknown command ${args.command}`)
  }
}

async function runServer(args: ParsedArguments): Promise<void> {
  const file = resolve(args.file ?? '')
  const source = await loadProgram(file)
  const running = await startBfHttpServer(source, {
    port: args.port,
    maxInstructions: args.maxInstructions,
    development: args.development,
  })
  console.log(`bfhttp v${VERSION}\n`)
  console.log(`Program: ${args.file}`)
  console.log(`Listening: ${running.url}`)

  const stop = (): void => {
    void running.close().finally(() => process.exit(0))
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

async function executeFile(file: string, maxInstructions: number): Promise<void> {
  if (extname(file) === '.bfh') throw new Error('exec accepts standard .bf files; use compile or run for .bfh files')
  const source = await readFile(resolve(file), 'utf8')
  const result = new BrainfuckInterpreter().run(source, { maxInstructions })
  process.stdout.write(result.output)
}

async function compileFile(file: string, outputOption: string | undefined): Promise<void> {
  if (extname(file) !== '.bfh') throw new Error('compile expects a .bfh file')
  const inputPath = resolve(file)
  const outputPath = resolve(outputOption ?? inputPath.slice(0, -4) + '.bf')
  const source = await readFile(inputPath, 'utf8')
  await writeFile(outputPath, `${compileBfh(source)}\n`, 'utf8')
  console.log(outputPath)
}

async function loadProgram(file: string): Promise<string> {
  const source = await readFile(file, 'utf8')
  const extension = extname(file)
  if (extension === '.bfh') return compileBfh(source)
  if (extension !== '.bf') throw new Error(`${basename(file)} must use the .bf or .bfh extension`)
  return source
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  let command: string | undefined
  let file: string | undefined
  let port = DEFAULT_PORT
  let maxInstructions = DEFAULT_MAX_INSTRUCTIONS
  let development = false
  let output: string | undefined
  let help = false
  let version = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') help = true
    else if (argument === '--version' || argument === '-v') version = true
    else if (argument === '--development') development = true
    else if (argument === '--port') port = parsePositiveInteger(argv[++index], '--port', true)
    else if (argument === '--max-instructions') maxInstructions = parsePositiveInteger(argv[++index], '--max-instructions')
    else if (argument === '--output' || argument === '-o') output = requireValue(argv[++index], argument)
    else if (argument?.startsWith('-')) throw new Error(`unknown option ${argument}`)
    else if (command === undefined) command = argument
    else if (file === undefined) file = argument
    else throw new Error(`unexpected argument ${argument}`)
  }

  return {
    ...(command === undefined ? {} : { command }),
    ...(file === undefined ? {} : { file }),
    port,
    maxInstructions,
    development,
    ...(output === undefined ? {} : { output }),
    help,
    version,
  }
}

function parsePositiveInteger(value: string | undefined, option: string, allowZero = false): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < (allowZero ? 0 : 1) || (option === '--port' && parsed > 65_535)) {
    throw new Error(`${option} requires a valid integer`)
  }
  return parsed
}

function requireValue(value: string | undefined, option: string): string {
  if (value === undefined || value.startsWith('-')) throw new Error(`${option} requires a value`)
  return value
}
