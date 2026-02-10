import throttle from 'lodash/throttle'

export type DataType = {
  delay?: number // 节流间隔时间（毫秒）
  leading?: boolean // 是否在开始时执行
  trailing?: boolean // 是否在结束时执行
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

  // 节流
  const throttleOutput = throttle(
    (val: any) => {
      outputs?.trigger?.(val)
    },
    data.delay,
    { leading: data.leading, trailing: data.trailing },
  )

  inputs.trigger?.((val: any) => {
    try {
      throttleOutput(val)
    } catch (error: any) {
      console.error('节流执行失败:', error)
    }
  })
}

;(handler as any).__useCache = true
export default handler
