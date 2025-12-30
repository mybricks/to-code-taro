import Taro from '@tarojs/taro';

export type DataType = {
  dynamic?: boolean;
  title?: string;
  duration?: number | string;
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
    if (data?.dynamic) {
      // 动态输入
      try {
        const toastConfig: any = {
          title: typeof val === 'string' ? val : val?.title || data.title || '',
          duration: Number(val && typeof val === 'object' ? (val?.duration ?? data.duration ?? 1000) : data.duration ?? 1000),
          mask: val && typeof val === 'object' ? (val?.mask ?? data.mask ?? false) : data.mask ?? false,
        };
        
        if (val && typeof val === 'object' && val.icon) {
          toastConfig.icon = val.icon;
        } else if (data.icon) {
          toastConfig.icon = data.icon;
        }
        
        if (val && typeof val === 'object' && val.image) {
          toastConfig.image = val.image;
        } else if (data.image) {
          toastConfig.image = data.image;
        }

        Taro.showToast(toastConfig);
        
        if (data.asynchronous) {
          setTimeout(() => {
            outputs.afterShowToast(val);
          }, Number(val && typeof val === 'object' ? (val?.duration ?? data.duration ?? 1000) : data.duration ?? 1000));
        } else {
          outputs.afterShowToast(val);
        }
      } catch (error) {
        console.error('显示 Toast 失败:', error);
      }
    } else {
      // 非动态输入
      try {
        const toastConfig: any = {
          title: data.title || '',
          duration: Number(data.duration || 1000),
          mask: data.mask ?? false,
        };
        
        if (data.icon) {
          toastConfig.icon = data.icon;
        }
        
        if (data.image) {
          toastConfig.image = data.image;
        }

        Taro.showToast(toastConfig);
        
        if (data.asynchronous) {
          setTimeout(() => {
            outputs.afterShowToast(val);
          }, Number(data.duration || 1000));
        } else {
          outputs.afterShowToast(val);
        }
      } catch (error) {
        console.error('显示 Toast 失败:', error);
      }
    }
  });
};

