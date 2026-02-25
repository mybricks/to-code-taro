import Taro from '@tarojs/taro'

export type DataType = {}

export type ValType = string

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

  inputs.call?.((imagePath) => {
    try {
      // 判断是否为远程图片地址
      const isRemoteImage =
        imagePath.startsWith('http://') || imagePath.startsWith('https://')

      const saveVideo = (filePath: string) => {
        Taro.saveVideoToPhotosAlbum({
          filePath,
          success: (res: any) => {
            Taro.showToast({
              title: '保存成功',
              icon: 'none',
              duration: 1000,
            })

            outputs['onSuccess'](res)
          },
          fail: (res: any) => {
            switch (res.errno) {
              // 用户未授权，需要引导用户授权
              case 103: // 用户拒绝了授权
                Taro.showModal({
                  title: '提示',
                  content: '请先授权保存视频到相册',
                  showCancel: true,
                  confirmText: '去授权',
                  cancelText: '取消',
                  success: (res: any) => {
                    if (res.confirm) {
                      Taro.openSetting({
                        success: (res: any) => {
                          if (res.authSetting['scope.writePhotosAlbum']) {
                            // 用户已授权，重新尝试保存图片
                            Taro.saveVideoToPhotosAlbum({
                              filePath,
                              success: (res: any) => {
                                Taro.showToast({
                                  title: '保存成功',
                                  icon: 'none',
                                  duration: 1000,
                                })

                                outputs['onSuccess'](res)
                              },
                              fail: (err: any) => {
                                outputs['onFail'](err)
                              },
                            })
                          } else {
                            outputs['onFail']()
                          }
                        },
                        fail: (err: any) => {
                          outputs['onFail'](err)
                        },
                      })
                    } else {
                      outputs['onFail']()
                    }
                  },
                  fail: (err: any) => {
                    outputs['onFail'](err)
                  },
                })
                break

              default:
                outputs['onFail'](res)
                break
            }
          },
        })
      }

      if (isRemoteImage) {
        // 远程图片地址，先下载图片
        Taro.downloadFile({
          url: imagePath,
          success: (res: any) => {
            if (res.statusCode === 200) {
              saveVideo(res.tempFilePath)
            } else {
              outputs['onFail'](res)
            }
          },
          fail: (err: any) => {
            outputs['onFail'](err)
          },
        })
      } else {
        // 本地图片地址，直接保存
        saveVideo(imagePath)
      }
    } catch (error: any) {
      console.error('保存视频到系统相册失败:', error)
      outputs.onFail({
        errMsg: error?.message || '保存视频到系统相册失败',
      })
    }
  })
}
