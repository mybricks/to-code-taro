import Taro from '@tarojs/taro'

export type DataType = {}

export interface Inputs {
  call?: (fn: () => void) => void
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

  inputs.call?.(() => {
    try {
      Taro.getWeRunData({
        success: (res: any) => {
          outputs['onSuccess']({
            encryptedData: res.encryptedData,
            iv: res.iv,
          })
        },
        fail: (res: any) => {
          switch (res.err_code) {
            // 用户未授权，需要引导用户授权
            case '-12006':
            case -12006:
              Taro.showModal({
                title: '提示',
                content: '请先授权获取微信运动数据',
                showCancel: true,
                confirmText: '去授权',
                cancelText: '取消',
                success: (res: any) => {
                  if (res.confirm) {
                    Taro.openSetting({
                      success: (res: any) => {
                        if (res.authSetting['scope.werun']) {
                          Taro.getWeRunData({
                            success: (res: any) => {
                              outputs['onSuccess']({
                                encryptedData: res.encryptedData,
                                iv: res.iv,
                              })
                            },
                            fail: (err: any) => {
                              outputs['onFail'](err)
                            },
                          })
                        } else {
                          outputs['onFail'](res)
                        }
                      },
                    })
                  } else {
                    outputs['onFail']()
                  }
                },
              })
              break

            default:
              outputs['onFail'](res)
              break
          }
        },
      })
    } catch (error: any) {
      console.error('获取运动步数失败:', error)
      outputs.onFail({
        errMsg: error?.message || '获取运动步数失败',
      })
    }
  })
}
