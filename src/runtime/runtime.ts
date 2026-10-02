import { BrainfuckInterpreter } from '../interpreter/interpreter.js'
import { BFHTTP_MEMORY_SIZE } from '../protocol/constants.js'
import { createHostController } from './host-api.js'
import { createRequestMemory } from './request.js'
import type { BfHttpRequest, BfHttpResponse, RuntimeOptions } from './types.js'

export class BfHttpRuntime {
  public constructor(private readonly options: RuntimeOptions = {}) {}

  public execute(source: string, request: BfHttpRequest): BfHttpResponse {
    const controller = createHostController(request)
    const result = new BrainfuckInterpreter().run(source, {
      input: request.body,
      initialMemory: createRequestMemory(request),
      memorySize: BFHTTP_MEMORY_SIZE,
      extended: true,
      hostCall: controller.call,
      ...(this.options.maxInstructions === undefined ? {} : { maxInstructions: this.options.maxInstructions }),
      ...(this.options.timeoutMs === undefined ? {} : { timeoutMs: this.options.timeoutMs }),
    })
    return controller.finish(result.output)
  }
}
