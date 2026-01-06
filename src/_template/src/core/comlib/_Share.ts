import Taro from '@tarojs/taro';

export type DataType = {
  title?: string;
  path?: string;
  imageUrl?: string;
};

export interface Inputs {
  share?: (fn: (config: DataType, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
  onCancel: (value?: any) => void;
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

  inputs.share?.((val: DataType) => {
    try {
      const shareData = {
        title: val?.title || data.title || '分享',
        path: val?.path || data.path || '/pages/index/index',
        imageUrl: val?.imageUrl || data.imageUrl,
      };

      Taro.showShareMenu({
        withShareTicket: true,
        success: () => outputs.onSuccess(shareData),
        fail: (err) => outputs.onFail(err.errMsg || '分享失败'),
      });
    } catch (error: any) {
      console.error('分享失败:', error);
      outputs.onFail(error?.message || '分享失败');
    }
  });
};
