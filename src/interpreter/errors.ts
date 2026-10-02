export class BrainfuckError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class BrainfuckSyntaxError extends BrainfuckError {
  public constructor(message: string, public readonly sourceOffset: number) {
    super(`${message} at source offset ${sourceOffset}`)
  }
}

export class BrainfuckMemoryError extends BrainfuckError {}

export class BrainfuckExecutionLimitError extends BrainfuckError {
  public constructor(public readonly limit: number) {
    super(`Brainfuck instruction limit of ${limit} exceeded`)
  }
}

export class BrainfuckRuntimeError extends BrainfuckError {}
