import Taro from "@tarojs/taro";

export type DataType = {
};

export interface Inputs {
  hideToast?: (
    fn: (config: any, relOutputs?: any) => void,
  ) => void;
}

export interface Outputs {
  afterHideToast: (value?: any) => void;
}

interface IOContext {
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.hideToast?.((val) => {
    Taro.hideToast({
      noConflict: true,
      complete: () => {
        outputs["afterHideToast"](val);
      },
    });
  });
};
