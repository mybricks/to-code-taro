import Taro from "@tarojs/taro";

export type DataType = {};

export interface Inputs {
  hideLoading?: (fn: (config: any, relOutputs?: any) => void) => void;
}

export interface Outputs {
  afterHideLoading: (value?: any) => void;
}

interface IOContext {
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.hideLoading?.((val) => {
    Taro.hideLoading({
      noConflict: true,
      complete: (e) => {
        outputs["afterHideLoading"](val);
      },
    });
  });
};
