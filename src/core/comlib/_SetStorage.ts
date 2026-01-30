import Taro from "@tarojs/taro";

export type DataType = {};

export interface Inputs {
  setStorage?: (fn: (config: any, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.setStorage?.((props: any) => {
    try {
      Object.keys(props).forEach((key) => {
        Taro.setStorageSync(key, props[key]);
      });

      outputs["onSuccess"](props);
    } catch (e) {
      outputs["onFail"](props);
    }
  });
};
