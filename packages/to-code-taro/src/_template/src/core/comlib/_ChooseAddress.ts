import Taro from "@tarojs/taro";

export type DataType = {};

export interface Inputs {
  chooseAddress?: (fn: () => void) => void;
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

  inputs.chooseAddress?.(() => {
    try {
      Taro.chooseAddress({
        success(res: any) {
          outputs["onSuccess"](res);
        },
        fail(err: any) {
          outputs["onFail"](err);
        },
      });
    } catch (error: any) {
      console.error("获取收货地址失败:", error);
      outputs.onFail({
        errMsg: error?.message || "获取收货地址失败",
      });
    }
  });
};
