import Taro from '@tarojs/taro';

export type DataType = {
  key?: string;
  sync?: boolean;
};

export interface Inputs {
  getStorage?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.getStorage?.((val: DataType) => {
    try {
      const key = val?.key || data.key;
      const useSync = val?.sync !== undefined ? val.sync : data.sync || false;

      if (!key) {
        outputs.onFail('存储 key 不能为空');
        return;
      }

      if (useSync) {
        try {
          const value = Taro.getStorageSync(key);
          outputs.onSuccess({ key, value });
        } catch (error: any) {
          outputs.onFail(error?.message || '读取本地缓存失败');
        }
      } else {
        Taro.getStorage({
          key,
          success: (res) => outputs.onSuccess({ key, value: res.data }),
          fail: (err) => outputs.onFail(err.errMsg || '读取本地缓存失败'),
        });
      }
    } catch (error: any) {
      console.error('读取本地缓存失败:', error);
      outputs.onFail(error?.message || '读取本地缓存失败');
    }
  });
};
