import Taro from '@tarojs/taro';

export type DataType = {
  phoneNumber?: string;
};

export interface Inputs {
  callPhone?: (fn: (config: DataType | string, relOutputs?: any) => void) => void;
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

  inputs.callPhone?.((val: DataType | string) => {
    try {
      const phoneNumber = typeof val === 'string' ? val : val?.phoneNumber || data.phoneNumber;

      if (!phoneNumber) {
        outputs.onFail('电话号码不能为空');
        return;
      }

      Taro.makePhoneCall({
        phoneNumber,
        success: () => outputs.onSuccess({ phoneNumber }),
        fail: (err) => outputs.onFail(err.errMsg || '拨打电话失败'),
      });
    } catch (error: any) {
      console.error('拨打电话失败:', error);
      outputs.onFail(error?.message || '拨打电话失败');
    }
  });
};
