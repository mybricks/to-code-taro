import Taro from '@tarojs/taro'

export type DataType = {}

export type ValType = {
  finderUserName: string
  feedId: string
}

export interface Inputs {
  openChannelsActivity?: (fn: (val: ValType) => void) => void
}

export interface Outputs {
  openChannelsActivitySuccess: (value?: any) => void
  openChannelsActivityFail: (value?: any) => void
}

interface IOContext {
  inputs: Inputs
  outputs: Outputs
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.openChannelsActivity?.((val) => {
    try {
      Taro.openChannelsActivity({
        finderUserName: val.finderUserName,
        feedId: val.feedId,
        success: function (res: any) {
          console.log('接口调用成功', res)
          outputs['openChannelsActivitySuccess']?.(res)
        },
        fail: function (err: any) {
          console.error('接口调用失败', err)
          outputs['openChannelsActivityFail']?.(err)
        },
      })
    } catch (error: any) {
      console.error('打开视频号失败:', error)
      outputs.openChannelsActivityFail({
        errMsg: error?.message || '打开视频号失败',
      })
    }
  })
}
