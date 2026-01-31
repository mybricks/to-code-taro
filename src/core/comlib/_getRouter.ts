import Taro from '@tarojs/taro'

export type DataType = {}

export interface Inputs {
  call?: (fn: (config: DataType, relOutputs?: any) => void) => void
}

export interface Outputs {
  onComplete: (value?: any) => void
}

interface IOContext {
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.call?.(() => {
    try {
      let router = Taro.getCurrentInstance()?.router

      let path = router?.path || ''
      let query = router?.params || {}
      let scene = Taro.getEnterOptionsSync().scene || 0
      outputs['onComplete']({ path, query, scene })
    } catch (error: any) {
      console.error('获取路由信息失败:', error)
    }
  })
}
