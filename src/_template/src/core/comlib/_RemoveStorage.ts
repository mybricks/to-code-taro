import Taro from '@tarojs/taro';

export type DataType = {
  key?: string;
  sync?: boolean;
};

export interface Inputs {
  removeStorage?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.removeStorage?.((val: DataType) => {
    try {
      const key = val?.key || data.key;
      const useSync = val?.sync !== undefined ? val.sync : data.sync || false;

      if (!key) {
        outputs.onFail('存储 key 不能为空');
        return;
      }

      if (useSync) {
        try {
          Taro.removeStorageSync(key);
          outputs.onSuccess({ key });
        } catch (error: any) {
          outputs.onFail(error?.message || '移除本地缓存失败');
        }
      } else {
        Taro.removeStorage({
          key,
          success: () => outputs.onSuccess({ key }),
          fail: (err) => outputs.onFail(err.errMsg || '移除本地缓存失败'),
        });
      }
    } catch (error: any) {
      console.error('移除本地缓存失败:', error);
      outputs.onFail(error?.message || '移除本地缓存失败');
    }
  });
};
