import Taro from '@tarojs/taro'

export type DataType = {}

export type ValType = {
  urls: string[]
  current?: number
}

export interface Inputs {
  call?: (fn: (val: ValType) => void) => void
}

export interface Outputs {
  onSuccess: (value?: any) => void
  onFail: (value?: any) => void
}

interface IOContext {
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.call?.((val) => {
    try {
      let params = {
        urls: val.urls,
        current: val.urls?.[0],
      }

      if (val.current) {
        params['current'] = val.urls?.[val.current ?? 0]
      }

      Taro.previewImage({
        ...params,
        success: () => {
          outputs['onSuccess']()
        },
        fail: (error: any) => {
          outputs['onFail'](error)
        },
      })
    } catch (error: any) {
      console.error('预览图片失败:', error)
      outputs.onFail({
        errMsg: error?.message || '预览图片失败',
      })
    }
  })
}
