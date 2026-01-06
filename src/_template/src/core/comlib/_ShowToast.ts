import Taro from '@tarojs/taro';

export type DataType = {
  dynamic?: boolean;
  title?: string;
  duration?: number;
  mask?: boolean;
  asynchronous?: boolean;
  icon?: 'success' | 'error' | 'loading' | 'none';
  image?: string;
};

export interface Inputs {
  showToast?: (fn: (config: DataType | string, relOutputs?: any) => void) => void;
}

export interface Outputs {
  afterShowToast: (value?: any) => void;
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

  inputs.showToast?.((val: DataType | string) => {
    try {
      // 构建 Toast 配置
      const toastConfig: any = {
        title: typeof val === 'string' ? val : val?.title || data.title || '',
        duration: Number(typeof val === 'object' && val?.duration ? val.duration : data.duration || 1000),
        mask: typeof val === 'object' && val?.mask !== undefined ? val.mask : data.mask || false,
      };

      // 图标配置
      if (typeof val === 'object' && val?.icon) {
        toastConfig.icon = val.icon;
      } else if (data.icon) {
        toastConfig.icon = data.icon;
      }

      // 图片配置
      if (typeof val === 'object' && val?.image) {
        toastConfig.image = val.image;
      } else if (data.image) {
        toastConfig.image = data.image;
      }

      Taro.showToast(toastConfig);

      // 处理输出回调
      const triggerOutput = () => outputs.afterShowToast(val);

      if (data.asynchronous) {
        setTimeout(triggerOutput, toastConfig.duration);
      } else {
        triggerOutput();
      }
    } catch (error) {
      console.error('显示 Toast 失败:', error);
    }
  });
};

