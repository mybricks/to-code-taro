import CryptoJS from 'crypto-js'
import * as Taro from '@tarojs/taro'
import { isH5 } from './env'

interface UploadOssHelperOptions {
  accessKeyId: string
  accessKeySecret: string
  timeout?: number
  maxSize?: number
}

interface UploadOssParams {
  OSSAccessKeyId: string
  policy: string
  signature: string
}

class UploadOssHelper {
  private accessKeyId: string
  private accessKeySecret: string
  private timeout: number
  private maxSize: number

  constructor(options: UploadOssHelperOptions) {
    this.accessKeyId = options.accessKeyId
    this.accessKeySecret = options.accessKeySecret
    this.timeout = options.timeout || 1
    this.maxSize = options.maxSize || 10
  }

  createUploadParams(): UploadOssParams {
    const policy = this.getPolicyBase64()
    const signature = this.sign(policy)
    return {
      OSSAccessKeyId: this.accessKeyId,
      policy,
      signature,
    }
  }

  private getPolicyBase64(): string {
    const date = new Date()
    date.setHours(date.getHours() + this.timeout)
    const policyText = {
      expiration: date.toISOString(),
      conditions: [['content-length-range', 0, this.maxSize * 1024 * 1024]],
    }
    const policy = JSON.stringify(policyText)

    if (isH5()) {
      return btoa(unescape(encodeURIComponent(policy)))
    } else {
      const policyBuffer = new Uint8Array(
        policy.split('').map((char) => char.charCodeAt(0))
      ).buffer
      return Taro.arrayBufferToBase64(policyBuffer)
    }
  }

  private sign(policy: string): string {
    return CryptoJS.HmacSHA1(policy, this.accessKeySecret).toString(CryptoJS.enc.Base64)
  }
}

export default UploadOssHelper
