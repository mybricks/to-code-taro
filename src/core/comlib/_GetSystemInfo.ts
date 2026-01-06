import Taro from '@tarojs/taro';

export type DataType = {
  sync?: boolean;
};

export interface Inputs {
  getSystemInfo?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.getSystemInfo?.((val: DataType) => {
    try {
      const useSync = val?.sync !== undefined ? val.sync : data.sync || false;

      if (useSync) {
        try {
          const systemInfo = Taro.getSystemInfoSync();
          outputs.onSuccess(systemInfo);
        } catch (error: any) {
          outputs.onFail(error?.message || '获取系统信息失败');
        }
      } else {
        Taro.getSystemInfo({
          success: (res) => outputs.onSuccess(res),
          fail: (err) => outputs.onFail(err.errMsg || '获取系统信息失败'),
        });
      }
    } catch (error: any) {
      console.error('获取系统信息失败:', error);
      outputs.onFail(error?.message || '获取系统信息失败');
    }
  });
};
