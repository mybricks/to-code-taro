import Taro from '@tarojs/taro';

export type DataType = {
  type?: 'wgs84' | 'gcj02';
  altitude?: boolean;
  timeout?: number;
};

export interface Inputs {
  getLocation?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.getLocation?.((val: DataType) => {
    try {
      const locationConfig = {
        type: val?.type || data.type || 'wgs84',
        altitude: val?.altitude !== undefined ? val.altitude : data.altitude || false,
        timeout: val?.timeout || data.timeout || 30000,
        success: (res: any) => {
          outputs.onSuccess(res);
        },
        fail: (err: any) => {
          outputs.onFail(err.errMsg || '获取地理位置失败');
        },
      };

      Taro.getLocation(locationConfig);
    } catch (error: any) {
      console.error('获取地理位置失败:', error);
      outputs.onFail(error?.message || '获取地理位置失败');
    }
  });
};
