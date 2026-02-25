import Taro from '@tarojs/taro'

export type DataType = {}

export type ValType = {
  finderUserName: string
}

export interface Inputs {
  openChannelsUserProfile?: (fn: (val: ValType) => void) => void
}

export interface Outputs {
  openChannelsUserProfileSuccess: (value?: any) => void
  openChannelsUserProfileFail: (value?: any) => void
}

interface IOContext {
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.openChannelsUserProfile?.((val) => {
    try {
      Taro.openChannelsUserProfile({
        finderUserName: val.finderUserName,
        success: function (res: any) {
          outputs['openChannelsUserProfileSuccess']?.(res)
        },
        fail: function (err: any) {
          outputs['openChannelsUserProfileFail']?.(err)
        },
      })
    } catch (error: any) {
      console.error('打开视频号主页失败:', error)
      outputs.openChannelsUserProfileFail({
        errMsg: error?.message || '打开视频号主页失败',
      })
    }
  })
}
