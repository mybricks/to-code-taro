import Taro from '@tarojs/taro';

export type DataType = {
  key?: string;
  value?: any;
  sync?: boolean;
};

export interface Inputs {
  setStorage?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.setStorage?.((val: DataType) => {
    try {
      const key = val?.key || data.key;
      const value = val?.value !== undefined ? val.value : data.value;
      const useSync = val?.sync !== undefined ? val.sync : data.sync || false;

      if (!key) {
        outputs.onFail('存储 key 不能为空');
        return;
      }

      const result = { key, value };

      if (useSync) {
        Taro.setStorageSync(key, value);
        outputs.onSuccess(result);
      } else {
        Taro.setStorage({
          key,
          data: value,
          success: () => outputs.onSuccess(result),
          fail: (err) => outputs.onFail(err.errMsg || '写入本地缓存失败'),
        });
      }
    } catch (error: any) {
      console.error('写入本地缓存失败:', error);
      outputs.onFail(error?.message || '写入本地缓存失败');
    }
  });
};

