import { isUndef } from '../tools/core'

export type DataType = {
  index: number
}

export interface Inputs {
  delete?: (fn: (config: DataType, relOutputs?: any) => void) => void
}

export interface Outputs {
  success: (value?: any) => void
}

export interface Env {
  tabbar?: {
    removeTabBarBadge: (params: { index: number }) => Promise<void>
  }
}

interface IOContext {
  env: Env
  data: DataType
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const data: DataType = context.data
  const env: Env = context.env
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.delete?.((val) => {
    let params = { index: data.index }
    if (!isUndef(val?.index)) {
      params = val
    }
    env?.tabbar
      ?.removeTabBarBadge?.({ index: parseFloat(params.index + '') - 1 })
      .then(() => {
        outputs['success']?.(val)
      })
  })
}
