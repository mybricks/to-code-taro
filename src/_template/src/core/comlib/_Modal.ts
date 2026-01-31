import Taro from '@tarojs/taro'

export type DataType = {
  dynamic?: boolean
  title?: string
  content?: string
  /** 微信/部分端支持，可编辑输入框 */
  // editable?: boolean;
  showCancel?: boolean
  cancelText?: string
  cancelColor?: string
  confirmText?: string
  confirmColor?: string
}

export interface Inputs {
  /** 显示模态对话框 */
  show?: (fn: (config?: DataType, relOutputs?: any) => void) => void
}

export interface Outputs {
  onConfirm: (value?: any) => void
  onCancel: (value?: any) => void
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

  inputs.show?.(async (val) => {
    try {
      let param = {
        ...data,
        success: (res: any) => {
          if (res.confirm) {
            // if (data.editable) {
            //   outputs["onConfirm"](res.content);
            // } else {
            outputs['onConfirm'](val)
            // }
          } else {
            outputs['onCancel'](val)
          }
        },
      }

      if (data?.dynamic && val) {
        //开启了动态输入
        param.content = val.content ?? ''
        param.title = val.title ?? ''
      } else {
        if (data.content) {
          param.content = data.content.replace(/\n/g, '\r\n')
        }
      }

      Taro.showModal(param)
    } catch (error: any) {
      console.error('显示 Modal 失败:', error)
    }
  })
}
