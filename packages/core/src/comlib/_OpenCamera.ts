import Taro from '@tarojs/taro'

export type DataType = {
  selectMethodConfig?: 'both' | 'camera' | 'album' // 照片选取方式
  photoCount?: number // 选择的照片数量
}

export interface Inputs {
  takePhotos?: (fn: () => void) => void
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

  inputs.takePhotos?.(() => {
    try {
      Taro.chooseImage({
        count: data.photoCount, // 默认9
        sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
        sourceType: data.selectMethodConfig, // 可以指定来源是相册还是相机，默认二者都有，在H5浏览器端支持使用 `user` 和 `environment`分别指定为前后摄像头
        success: function (res: any) {
          // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
          // var tempFilePaths = res.tempFilePaths;
          // outputs["onSuccess"]?.(tempFilePaths);
          outputs['onSuccess']?.(res)
        },
        fail: ({ errMsg }: any) => {
          outputs['onFail']?.({ errMsg })
        },
      })
    } catch (error: any) {
      console.error('打开相机失败:', error)
      outputs.onFail(error?.message || '打开相机失败')
    }
  })
}
