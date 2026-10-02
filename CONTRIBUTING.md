# Contributing to bfhttp

Thanks for considering a contribution to a project that gives Brainfuck an
HTTP server on purpose.

## Before you start

- Use Node.js 24 or newer.
- Search existing issues before opening a new one.
- Keep standard Brainfuck behavior separate from bfhttp extended mode.
- Discuss ABI-breaking changes in an issue before implementing them.
- Do not add filesystem, shell, `eval`, or arbitrary JavaScript access to the
  guest program.

## Local development

```bash
npm ci
npm test
npm run build
```

Run the development CLI with:

```bash
npm run dev -- run examples/hello-http.bf
```

Then test it from another terminal:

```bash
curl http://localhost:8080
```

## Project layout

- `src/interpreter`: standard Brainfuck VM and optional host-call hook
- `src/protocol`: public ABI constants, opcodes, and memory helpers
- `src/runtime`: request isolation, host API, and native HTTP server
- `src/compiler`: the optional `.bfh` preprocessor
- `src/cli`: command-line interface
- `tests`: interpreter, compiler, runtime, and end-to-end HTTP tests
- `examples`: programs that prove this regrettable concept works

## Pull requests

Keep pull requests focused. Add tests for behavior changes, run the complete
verification commands, and update the README when changing the CLI, ABI, host
commands, security model, or examples.

Commit messages do not need a rigid format, but short imperative summaries are
appreciated. By contributing, you agree that your contribution is licensed
under the project's MIT License.
