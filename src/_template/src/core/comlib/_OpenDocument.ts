import Taro from '@tarojs/taro'

export type DataType = {}

export interface Inputs {
  url?: (fn: (path: string) => void) => void
}

export interface Outputs {
  onSuccess: (value?: any) => void
  onFail: (value?: any) => void
}

interface IOContext {
  inputs: Inputs
  outputs: Outputs
}

const parseFileInfo = (url: string) => {
  try {
    // 解码URL中的中文字符
    const decodedUrl = decodeURIComponent(url)

    // 获取URL的最后一部分作为文件名
    const fileName = decodedUrl.split('/').pop()

    // 获取文件扩展名
    const fileExtension = fileName?.split('.')?.pop()?.toLowerCase()

    return {
      fileName: fileName, // 完整文件名
      extension: fileExtension, // 文件扩展名
    }
  } catch (error) {
    console.error('URL解析失败:', error)
    return null
  }
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs
  const outputs: Outputs = context.outputs

  inputs.url?.((path) => {
    try {
      // 判断是否为远程文件地址
      const isRemoteImage =
        path.startsWith('http://') || path.startsWith('https://')
      const fileInfo = parseFileInfo(path)

      const openDocument = (filePath: string) => {
        Taro.openDocument({
          filePath,
          showMenu: true,
          success: (res: any) => {
            outputs['onSuccess'](res)
          },
          fail: (res: any) => {
            console.error(res)
            outputs['onFail'](res)
          },
        })
      }

      if (isRemoteImage) {
        // 远程地址，先下载
        Taro.downloadFile({
          url: path,
          filePath: `${Taro.env.USER_DATA_PATH}/${fileInfo?.fileName}`,
          success: (res: any) => {
            if (res.statusCode === 200) {
              openDocument(res.filePath)
            } else {
              outputs['onFail'](res)
            }
          },
          fail: (err: any) => {
            outputs['onFail'](err)
          },
        })
      } else {
        // 本地地址，直接打开文件预览
        openDocument(path)
      }
    } catch (error: any) {
      console.error('打开文档失败:', error)
      outputs.onFail?.({
        errMsg: error?.message || '打开文档失败',
      })
    }
  })
}
