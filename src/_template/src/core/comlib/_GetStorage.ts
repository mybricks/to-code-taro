import Taro from "@tarojs/taro";

export type DataType = {
  key?: string;
  useDynamicKey?: boolean;
};

export interface Inputs {
  getStorage?: (fn: (key: string, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onComplete: (value?: any) => void;
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

  inputs.getStorage?.((key) => {
    let myKey = data.useDynamicKey ? key : data.key;

    if (!myKey || typeof myKey !== "string") {
      outputs["onComplete"](null);
      return;
    }

    try {
      let value = Taro.getStorageSync(myKey);
      outputs["onComplete"](value);
    } catch (e) {
      outputs["onComplete"](null);
    }
  });
};
