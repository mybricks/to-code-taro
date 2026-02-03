import CryptoJS from 'crypto-js'

export type DataType = {
  key?: string
  iv?: string
}

export interface Inputs {
  call?: (fn: (config: string) => void) => void
}

export interface Outputs {
  result: (value?: string) => void
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

  inputs.call?.((val) => {
    try {
      if (!val || !data.key || !data.iv) {
        outputs['result']('')
        return
      }

      // 密钥修复：超长截取/不足补0
      const fixedKey = CryptoJS.enc.Utf8.parse(
        data.key.padEnd(32, '0').slice(0, 32),
      )
      const fixedIv = CryptoJS.enc.Utf8.parse(
        data.iv.padEnd(16, '0').slice(0, 16),
      )

      // AES 加密
      const encrypted = CryptoJS.AES.encrypt(val, fixedKey, {
        iv: fixedIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      })

      // 输出 Base64 编码的加密结果
      const encryptedBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64)

      // 输出加密结果
      outputs['result'](encryptedBase64)
    } catch (error: any) {
      console.error('AES加密失败:', error)
    }
  })
}
