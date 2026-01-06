import Taro from '@tarojs/taro';

export type DataType = {
  onlyFromCamera?: boolean;
  scanType?: ('barCode' | 'qrCode' | 'datamatrix' | 'pdf417')[];
};

export interface Inputs {
  scan?: (fn: (val: DataType | any, relOutputs?: any) => void) => void;
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

  inputs.scan?.((val: DataType | any) => {
    try {
      const scanConfig = {
        onlyFromCamera: val?.onlyFromCamera ?? data.onlyFromCamera ?? false,
        scanType: val?.scanType ?? data.scanType ?? ['barCode', 'qrCode'],
        success: (res: any) => {
          outputs.onSuccess(res.result || res);
        },
        fail: (err: any) => {
          outputs.onFail(err.errMsg || '扫码失败');
        },
      };

      Taro.scanCode(scanConfig);
    } catch (error: any) {
      console.error('扫码失败:', error);
      outputs.onFail(error?.message || '扫码失败');
    }
  });
};

