import { BrainfuckMemoryError } from './errors.js'

export const DEFAULT_MEMORY_SIZE = 30_000

export class BrainfuckMemory {
  public readonly cells: Uint8Array
  private currentPointer = 0

  public constructor(size = DEFAULT_MEMORY_SIZE, initialMemory?: Uint8Array) {
    if (!Number.isSafeInteger(size) || size < DEFAULT_MEMORY_SIZE) {
      throw new BrainfuckMemoryError(`Memory size must be an integer of at least ${DEFAULT_MEMORY_SIZE}`)
    }
    this.cells = new Uint8Array(size)
    if (initialMemory !== undefined) {
      if (initialMemory.length > size) {
        throw new BrainfuckMemoryError('Initial memory is larger than the configured memory')
      }
      this.cells.set(initialMemory)
    }
  }

  public get pointer(): number {
    return this.currentPointer
  }

  public get value(): number {
    return this.cells[this.currentPointer] ?? 0
  }

  public set value(value: number) {
    this.cells[this.currentPointer] = value
  }

  public moveRight(): void {
    if (this.currentPointer + 1 >= this.cells.length) {
      throw new BrainfuckMemoryError(`Pointer moved beyond memory at cell ${this.currentPointer + 1}`)
    }
    this.currentPointer += 1
  }

  public moveLeft(): void {
    if (this.currentPointer === 0) {
      throw new BrainfuckMemoryError('Pointer cannot move below cell 0')
    }
    this.currentPointer -= 1
  }
}
