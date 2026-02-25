import Taro from '@tarojs/taro'

export type DataType = {}

export interface Inputs {
  callPhone?: (fn: (config: string, relOutputs?: any) => void) => void
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

  inputs.callPhone?.((val: string) => {
    try {
      const phoneNumber = String(val)

      if (!phoneNumber) {
        outputs.onFail?.('电话号码不能为空')
        return
      }

      Taro.makePhoneCall({
        phoneNumber,
        success: () => outputs.onSuccess?.(true),
        fail: ({ errMsg }: any) => outputs.onFail?.({ errMsg }),
      })
    } catch (error: any) {
      console.error('拨打电话失败:', error)
      outputs.onFail?.({
        errMsg: error?.message || '拨打电话失败',
      })
    }
  })
}
