import Taro from '@tarojs/taro'

export type DataType = {
  mediaType?: ('image' | 'video')[]
  sourceType?: ('album' | 'camera')[]
  count?: number
  sizeType?: ('original' | 'compressed')[]
  maxDuration?: number
  camera?: 'back' | 'front'
}

export interface Inputs {
  chooseMedia?: (fn: () => void) => void
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

  inputs.chooseMedia?.(() => {
    try {
      let params = {
        count: data.count,
        mediaType: data.mediaType,
        sourceType: data.sourceType,
        maxDuration: data.maxDuration,
        sizeType: data.sizeType,
        camera: data.camera,
      }

      console.log('params', params)

      Taro.chooseMedia({
        ...params,
        success(res: any) {
          outputs['onSuccess'](res)
        },
        fail(err: any) {
          outputs['onFail'](err)
        },
      })
    } catch (error: any) {
      console.error('选择媒体失败:', error)
      outputs.onFail(error?.message || '选择媒体失败')
    }
  })
}
