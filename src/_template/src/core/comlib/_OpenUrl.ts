import Taro from '@tarojs/taro';

export type DataType = {
  url?: string;
  target?: '_blank' | '_self';
};

export interface Inputs {
  openUrl?: (fn: (config: DataType | string, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
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

  inputs.openUrl?.((val: DataType | string) => {
    try {
      const url = typeof val === 'string' ? val : val?.url || data.url;

      if (!url) {
        outputs.onFail('URL 地址不能为空');
        return;
      }

      // 检查是否为有效的 URL
      if (!/^https?:\/\//.test(url)) {
        outputs.onFail('URL 格式不正确，请以 http:// 或 https:// 开头');
        return;
      }

      Taro.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(url)}`,
        success: () => outputs.onSuccess({ url }),
        fail: (err) => outputs.onFail(err.errMsg || '打开链接失败'),
      });
    } catch (error: any) {
      console.error('打开链接失败:', error);
      outputs.onFail(error?.message || '打开链接失败');
    }
  });
};
