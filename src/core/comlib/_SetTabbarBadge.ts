import { isUndef } from '../tools/core'

export type DataType = {
  index: number
  text: string
}

export interface Inputs {
  show?: (fn: (config: DataType, relOutputs?: any) => void) => void
}

export interface Outputs {
  success: (value?: any) => void
}

export interface Env {
  tabbar?: {
    setTabBarBadge: (params: { index: number; text: string }) => Promise<void>
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

  inputs.show?.((val) => {
    let params = { index: data.index, text: data.text }
    if (!isUndef(val?.index) && !isUndef(val?.text)) {
      params = val
    }
    env?.tabbar
      ?.setTabBarBadge?.({
        index: parseFloat(params.index + '') - 1,
        text: params.text,
      })
      .then(() => {
        outputs['success']?.(val)
      })
  })
}
