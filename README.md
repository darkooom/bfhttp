# bfhttp

Because JavaScript wasn't painful enough.

Run HTTP servers with Brainfuck.

> [!WARNING]
> This is not a parody README. The server is real. The HTTP requests are real.
> The application logic is, regrettably, Brainfuck.

bfhttp bridges Brainfuck programs with a real HTTP runtime while keeping the
application logic inside the world's least reasonable programming language.

```console
$ bfhttp run examples/hello-http.bf
bfhttp v0.1.0

Program: examples/hello-http.bf
Listening: http://localhost:8080

$ curl http://localhost:8080
Hello from Brainfuck!
```

## Why?

Because every language eventually becomes a web framework if nobody steps in.

More seriously, bfhttp is a small experiment in interpreter design, capability
boundaries, host/guest ABIs, and running deliberately constrained programs
behind a practical system interface. The joke is the language; the runtime is
intended to be understandable, tested, and boring.

## How it works

Brainfuck is an eight-instruction language with a byte tape, a pointer, input,
output, and loops. It has no concept of TCP, HTTP, JSON, files, or operating
system calls. bfhttp therefore has two deliberately separate layers:

```text
HTTP client -> Node.js HTTP runtime -> bfhttp host API -> Brainfuck VM -> program
```

The VM is a complete, reusable Brainfuck interpreter. The Node.js layer owns
the socket, parses requests, creates an isolated VM for every request, and
exposes a small memory-based ABI. In extended mode, `!` asks the host to execute
the command in cell 0. In standard mode, `!` is an ordinary ignored comment.

## Requirements and installation

- Node.js 24 or newer
- npm

```bash
npm install
npm run build
npm link
```

During development, use the CLI without linking it:

```bash
npm run dev -- --help
```

## First Brainfuck program

`exec` runs standard Brainfuck without the HTTP extension:

```bash
npm run dev -- exec examples/hello.bf
```

It prints `Hello World!`.

## First HTTP server

```bash
npm run dev -- run examples/hello-http.bf
curl http://localhost:8080
```

The response is:

```text
Hello from Brainfuck!
```

Choose another port or instruction limit when needed:

```bash
bfhttp run app.bf --port 3000 --max-instructions 2000000
```

Each request receives a fresh 65,536-cell `Uint8Array`; state is never shared
between requests.

## Examples

```bash
# Echo the request body
bfhttp run examples/echo.bf
curl -X POST http://localhost:8080/echo -d 'hello'

# Read a query parameter
bfhttp run examples/query.bf
curl 'http://localhost:8080/hello?name=Darko'

# Demo-only login whose byte comparison runs in Brainfuck
bfhttp run examples/login.bf
curl -i -X POST http://localhost:8080/login -d 'darko:1234'
curl -i -X POST http://localhost:8080/login -d 'wrong'
```

The login example is a language demonstration, not an authentication system.

## CLI

```text
bfhttp run <file> [--port <number>] [--max-instructions <number>]
bfhttp exec <file> [--max-instructions <number>]
bfhttp compile <file> [--output <file>]
bfhttp --help
bfhttp --version
```

`run` accepts `.bf` and `.bfh`. `exec` intentionally uses standard Brainfuck.
`compile` turns the small `.bfh` syntax into an extended `.bf` program.

## Memory ABI

All 16-bit numbers are unsigned little-endian values. Request strings are
UTF-8. Cell 3 bit 0 is set when a request body is too large to mirror into the
data area; the complete body remains available as Brainfuck input and through
`READ_REQUEST_BODY`.

| Cells | Name | Meaning |
| --- | --- | --- |
| 0 | `COMMAND` | Host command; reset to zero after `!` |
| 1 | `COMMAND_STATUS` | 1 for success/match, 0 otherwise |
| 2 | `METHOD` | Encoded HTTP method |
| 3 | `FLAGS` | Request/runtime flags |
| 4–5 | `RESPONSE_STATUS` | HTTP response status |
| 10–11 | `REQUEST_PATH_PTR` | Path pointer |
| 12–13 | `REQUEST_PATH_LEN` | Path byte length |
| 14–15 | `REQUEST_BODY_PTR` | Body pointer when mirrored |
| 16–17 | `REQUEST_BODY_LEN` | Mirrored body byte length |
| 18–19 | `RESPONSE_BODY_PTR` | Response body pointer |
| 20–21 | `RESPONSE_BODY_LEN` | Response body byte length |
| 22–23 | `QUERY_PTR` | Raw query pointer |
| 24–25 | `QUERY_LEN` | Raw query byte length |
| 26–27 | `HEADER_PTR` | `Name: Value` header pointer |
| 28–29 | `HEADER_LEN` | Header byte length |
| 30–31 | `ARGUMENT_PTR` | Command argument pointer |
| 32–33 | `ARGUMENT_LEN` | Command argument byte length |
| 256+ | data area | Request and program data |

Method values are `GET=1`, `POST=2`, `PUT=3`, `PATCH=4`, `DELETE=5`,
`OPTIONS=6`, and `HEAD=7`. Unknown methods use 0.

## Host commands and extended Brainfuck

Set cell 0 and execute `!`:

| Value | Command | Behavior |
| ---: | --- | --- |
| 1 | `SET_STATUS` | Read the status from cells 4–5 |
| 2 | `SET_BODY` | Read the body pointer and length from cells 18–21 |
| 3 | `SET_HEADER` | Read one `Name: Value` header from cells 26–29 |
| 4 | `SEND_RESPONSE` | Mark the response ready to send |
| 5 | `READ_REQUEST_BODY` | Use the complete request body as the response body |
| 6 | `READ_QUERY` | Read the named query value and append it to the configured response buffer |
| 7 | `MATCH_ROUTE` | Compare an argument such as `GET /` with the current request |

The default sent response is status 200 with
`Content-Type: text/plain; charset=utf-8`. Normal `.` output becomes the body
when no body was selected explicitly. A program that never calls
`SEND_RESPONSE` receives a `204 No Content` response.

## `.bfh` preprocessor

The optional preprocessor is syntactic sugar. It emits an ordinary extended
Brainfuck file; the HTTP runtime does not depend on the DSL.

```text
@route GET /
@status 200
@header Content-Type text/plain
@body "Hello from Brainfuck!"
@send
```

```bash
bfhttp compile examples/hello.bfh
bfhttp run examples/hello.bfh
```

Version 1 supports `@route`, `@status`, `@header`, `@body`, and `@send`, with
multiple route blocks in one source file.

## Library API

```ts
import { BrainfuckInterpreter, startBfHttpServer } from 'bfhttp'

const result = new BrainfuckInterpreter().run(',.', {
  input: new TextEncoder().encode('A'),
  maxInstructions: 10_000_000,
})

const running = await startBfHttpServer('++++!', { port: 8080 })
await running.close()
```

The interpreter filters comments, validates brackets before execution, builds
a jump table once, uses byte overflow semantics, and reports syntax, memory,
runtime, and instruction-limit failures with dedicated error classes.

## Security model and limitations

Brainfuck programs should be treated as untrusted code. bfhttp applies a
10,000,000-instruction default limit, a 1 MiB transport body limit, bounded VM
memory, optional wall-clock checks, fresh per-request VMs, and an explicit host
command allowlist. Programs receive no filesystem, shell, `eval`, or arbitrary
JavaScript access. Hop-by-hop response headers are rejected.

The runtime executes synchronously inside one Node.js process. The wall-clock
check is cooperative at instruction boundaries; it is not process isolation.
Use stronger OS/container isolation before accepting programs from hostile
users. Request bodies larger than the ABI data area are not mirrored directly
onto the tape, but remain available through input and `READ_REQUEST_BODY`.

Production mode returns only `500 Internal Server Error`. Pass `--development`
to expose stack details while developing.

## Frequently regretted questions

### Is this production-ready?

No. It is pre-1.0, single-process, and executes Brainfuck on your HTTP request
path. Please enjoy the sentence you just read.

### Is the Brainfuck interpreter real?

Yes. It implements all eight standard instructions, byte overflow, input,
output, nested loops, bracket validation, pointer bounds, and a precomputed
jump table. HTTP support is an explicit optional extension rather than fake
Brainfuck-shaped JavaScript.

### Does the login demo really compare the password in Brainfuck?

Yes. It is also intentionally not real authentication. Both facts are tested.

### Can guest programs run shell commands or read files?

No. Host capabilities are allowlisted through the documented opcodes.

## Development

```bash
npm install
npm test
npm run build
```

The project uses native `node:http`, TypeScript, tsx, and Vitest; it deliberately
has no HTTP framework dependency.

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before
changing the ABI, and use [SECURITY.md](SECURITY.md) for vulnerability reports.

## License

MIT. Make terrible choices responsibly.
