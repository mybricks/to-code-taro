import Taro from '@tarojs/taro'

export type DataType = {
  SelectType?: 'all' | 'video' | 'image' | 'file' // 选择的文件类型
  SelectCount?: number // 选择的文件数量
}

export interface Inputs {
  chooseFile?: (fn: () => void) => void
}

export interface Outputs {
  onComplete: (value?: any) => void
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

  inputs.chooseFile?.(() => {
    try {
      Taro.chooseMessageFile({
        count: data.SelectCount,
        type: data.SelectType,
        success: function (res: any) {
          outputs['onComplete']({
            ...res,
          })
        },
      })
    } catch (error: any) {
      console.error('文件选择失败:', error)
    }
  })
}
