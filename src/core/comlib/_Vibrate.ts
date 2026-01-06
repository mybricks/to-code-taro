import Taro from '@tarojs/taro';

export type DataType = {
  type?: 'short' | 'long';
  duration?: number;
};

export interface Inputs {
  vibrate?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.vibrate?.((val: DataType) => {
    try {
      const type = val?.type || data.type || 'short';

      if (type === 'long') {
        Taro.vibrateLong({
          success: () => outputs.onSuccess('长振动成功'),
          fail: (err) => outputs.onFail(err.errMsg || '长振动失败'),
        });
      } else {
        Taro.vibrateShort({
          success: () => outputs.onSuccess('短振动成功'),
          fail: (err) => outputs.onFail(err.errMsg || '短振动失败'),
        });
      }
    } catch (error: any) {
      console.error('设备振动失败:', error);
      outputs.onFail(error?.message || '设备振动失败');
    }
  });
};
