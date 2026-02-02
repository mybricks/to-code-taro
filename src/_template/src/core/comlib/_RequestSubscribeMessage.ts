import Taro from '@tarojs/taro'

export type DataType = {
  tmplId: string
}

export interface Inputs {
  requestSubscribeMessage?: (fn: () => void) => void
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

  inputs.requestSubscribeMessage?.(() => {
    const { tmplId } = data

    // tmplId 为模板 ID，必填
    if (!tmplId) {
      outputs['onFail']({
        tmplId: data.tmplId,
        errMsg: '模板ID不能为空',
      })
      return
    }
    try {
      // 通过 Taro.requestSubscribeMessage 接口订阅消息
      Taro.requestSubscribeMessage({
        tmplIds: [tmplId],
        success: (res: any) => {
          if (res.errMsg === 'requestSubscribeMessage:ok') {
            outputs['onSuccess'](res)
          } else {
            outputs['onFail'](res)
          }
        },
        fail: (err: any) => {
          outputs['onFail'](err)
        },
      })
    } catch (error: any) {
      console.error('订阅消息失败:', error)
      outputs.onFail({
        errMsg: error?.message || '订阅消息失败',
      })
    }
  })
}
