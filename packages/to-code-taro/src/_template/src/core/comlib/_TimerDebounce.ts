import debounce from 'lodash/debounce'

export type DataType = {
  delay?: number // 防抖延迟时间（毫秒）
  isleading?: boolean // 是否在开始时执行
}

export interface Inputs {
  trigger?: (fn: (config: any, relOutputs?: any) => void) => void
}

export interface Outputs {
  trigger: (value?: any) => void
}

interface IOContext {
  data: DataType
  inputs: Inputs
  outputs: Outputs
}

const handler = (context: IOContext) => {
  const data: DataType = context.data
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  // 防抖
  const debounceOutput = debounce(
    (val: any) => {
      outputs['trigger'](val)
    },
    data.delay,
    data.isleading ? { leading: true } : void 0,
  )

  inputs.trigger?.((val) => {
    try {
      debounceOutput(val)
    } catch (error: any) {
      console.error('防抖执行失败:', error)
    }
  })
}

;(handler as any).__useCache = true
export default handler
