export type BfhAction =
  | { readonly type: 'status'; readonly value: number }
  | { readonly type: 'body'; readonly value: string }
  | { readonly type: 'header'; readonly name: string; readonly value: string }
  | { readonly type: 'send' }

export interface BfhRoute {
  readonly method?: string
  readonly path?: string
  readonly actions: BfhAction[]
}

export interface BfhProgram {
  readonly routes: BfhRoute[]
}
