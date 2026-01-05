import CryptoJS from 'crypto-js';

export type DataType = {
  key?: string;
  iv?: string;
  mode?: 'CBC' | 'ECB' | 'CFB' | 'OFB' | 'CTR';
  padding?: 'Pkcs7' | 'Iso97971' | 'AnsiX923' | 'Iso10126' | 'ZeroPadding' | 'NoPadding';
};

export interface Inputs {
  encrypt?: (fn: (config: DataType & { text: string }, relOutputs?: any) => void) => void;
  decrypt?: (fn: (config: DataType & { encryptedText: string }, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onEncryptSuccess: (value?: any) => void;
  onDecryptSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  // 模式映射
  const modeMap: Record<string, any> = {
    CBC: CryptoJS.mode.CBC,
    ECB: CryptoJS.mode.ECB,
    CFB: CryptoJS.mode.CFB,
    OFB: CryptoJS.mode.OFB,
    CTR: CryptoJS.mode.CTR,
  };

  // 填充方式映射
  const paddingMap: Record<string, any> = {
    Pkcs7: CryptoJS.pad.Pkcs7,
    Iso97971: CryptoJS.pad.Iso97971,
    AnsiX923: CryptoJS.pad.AnsiX923,
    Iso10126: CryptoJS.pad.Iso10126,
    ZeroPadding: CryptoJS.pad.ZeroPadding,
    NoPadding: CryptoJS.pad.NoPadding,
  };

  inputs.encrypt?.((val: DataType & { text: string }) => {
    try {
      const text = val.text || '';
      const key = val.key || data.key || 'defaultKey1234567890123456';
      const iv = val.iv || data.iv;
      const mode = modeMap[val.mode || data.mode || 'CBC'];
      const padding = paddingMap[val.padding || data.padding || 'Pkcs7'];

      if (!text) {
        outputs.onFail('待加密文本不能为空');
        return;
      }

      const keyBytes = CryptoJS.enc.Utf8.parse(key);
      const ivBytes = iv ? CryptoJS.enc.Utf8.parse(iv) : undefined;

      const encrypted = CryptoJS.AES.encrypt(text, keyBytes, {
        mode,
        padding,
        iv: ivBytes,
      });

      outputs.onEncryptSuccess({
        encryptedText: encrypted.toString(),
        originalText: text,
      });
    } catch (error: any) {
      console.error('AES加密失败:', error);
      outputs.onFail(error?.message || 'AES加密失败');
    }
  });

  inputs.decrypt?.((val: DataType & { encryptedText: string }) => {
    try {
      const encryptedText = val.encryptedText || '';
      const key = val.key || data.key || 'defaultKey1234567890123456';
      const iv = val.iv || data.iv;
      const mode = modeMap[val.mode || data.mode || 'CBC'];
      const padding = paddingMap[val.padding || data.padding || 'Pkcs7'];

      if (!encryptedText) {
        outputs.onFail('待解密文本不能为空');
        return;
      }

      const keyBytes = CryptoJS.enc.Utf8.parse(key);
      const ivBytes = iv ? CryptoJS.enc.Utf8.parse(iv) : undefined;

      const decrypted = CryptoJS.AES.decrypt(encryptedText, keyBytes, {
        mode,
        padding,
        iv: ivBytes,
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedText) {
        outputs.onFail('解密失败，可能密钥或参数不正确');
        return;
      }

      outputs.onDecryptSuccess({
        decryptedText,
        encryptedText,
      });
    } catch (error: any) {
      console.error('AES解密失败:', error);
      outputs.onFail(error?.message || 'AES解密失败');
    }
  });
};
