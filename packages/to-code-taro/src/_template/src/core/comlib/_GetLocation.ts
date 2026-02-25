import Taro from '@tarojs/taro'

export type DataType = {
  isHighAccuracy?: boolean
}

export interface Inputs {
  getLocation?: (fn: () => void) => void
}

export interface Outputs {
  onSuccess: (value?: any) => void
  onFail: (value?: any) => void
}

interface IOContext {
  data: DataType
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const data: DataType = context.data
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.getLocation?.(() => {
    try {
      Taro.getLocation({
        type: 'gcj02', //返回可以用于 Taro.openLocation的经纬度
        isHighAccuracy: data?.isHighAccuracy ?? false,
        success: function ({ latitude, longitude }: any) {
          outputs['onSuccess']?.({ latitude, longitude })
        },
        fail: ({ errMsg }: any) => {
          outputs['onFail']?.({ errMsg })
        },
      })
    } catch (error: any) {
      console.error('获取地理位置失败:', error)
      outputs.onFail?.({
        errMsg: error?.message || '获取地理位置失败',
      })
    }
  })
}
