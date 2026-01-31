import Taro from "@tarojs/taro";

export type DataType = {
  title?: string;
  mask?: boolean;
};

export interface Inputs {
  showLoading?: (fn: (config: any, relOutputs?: any) => void) => void;
}

export interface Outputs {
  afterShowLoading: (value?: any) => void;
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

  inputs.showLoading?.((val) => {
    Taro.showLoading({
      ...data,
      complete: () => {
        outputs["afterShowLoading"](val);
      },
    });
  });
};
