import Taro from '@tarojs/taro';

export type DataType = {
  key?: string;
  value?: any;
  sync?: boolean; // 是否使用同步方法
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
      // 优先使用动态输入的值，否则使用配置的值
      const key = val?.key || data?.key;
      const value = val?.value !== undefined ? val.value : data?.value;
      const useSync = val?.sync !== undefined ? val.sync : data?.sync ?? false;

      if (!key) {
        outputs?.onFail('存储 key 不能为空');
        return;
      }

      if (useSync) {
        // 使用同步方法
        try {
          Taro.setStorageSync(key, value);
          outputs?.onSuccess({ key, value });
        } catch (error: any) {
          console.error('写入本地缓存失败:', error);
          outputs?.onFail(error?.message || '写入本地缓存失败');
        }
      } else {
        // 使用异步方法
        Taro.setStorage({
          key,
          data: value,
          success: () => {
            outputs?.onSuccess({ key, value });
          },
          fail: (err) => {
            console.error('写入本地缓存失败:', err);
            outputs?.onFail(err.errMsg || '写入本地缓存失败');
          },
        });
      }
    } catch (error: any) {
      console.error('写入本地缓存失败:', error);
      outputs?.onFail(error?.message || '写入本地缓存失败');
    }
  });
};

