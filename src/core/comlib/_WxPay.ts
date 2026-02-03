import Taro from '@tarojs/taro'

export type DataType = {}

export type ValType = {
  nonce_str?: string
  nonceStr?: string
  timestamp?: string
  timeStamp?: string
  pay_sign?: string
  paySign?: string
  prepay_id?: string
}

export interface Inputs {
  wx_requestPayment_body?: (fn: (val: ValType) => void) => void
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
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.wx_requestPayment_body?.((val) => {
    const signType = 'RSA' //签名算法
    try {
      Taro.requestPayment({
        nonceStr: val.nonce_str ?? val.nonceStr, //兼容之前的下划线参数
        timeStamp: val.timestamp ?? val.timeStamp,
        signType,
        paySign: val.pay_sign ?? val.paySign,
        package: `prepay_id=${val.prepay_id}`,
        success: (res: any) => {
          outputs['onSuccess'](res)
        },
        fail: (err: any) => {
          outputs['onFail'](err)
        },
      })
    } catch (error: any) {
      console.error('微信支付弹窗失败:', error)
      outputs.onFail({
        errMsg: error?.message || '微信支付弹窗失败',
      })
    }
  })
}
