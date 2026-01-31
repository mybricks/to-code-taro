import Taro from "@tarojs/taro";

export type DataType = {};

export interface Inputs {
  setTitle?: (fn: (config: string) => void) => void;
}

export interface Outputs {
  complete: (value?: string) => void;
}

interface IOContext {
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.setTitle?.((value: string) => {
    try {
      if (value && typeof value === "string") {
        Taro.setNavigationBarTitle({
          title: value,
          success: () => {
            outputs.complete(value);
          },
          fail: (err: any) => {
            console.error("设置标题失败:", err);
          },
        });
      }
    } catch (error: any) {
      console.error("设置标题失败:", error);
    }
  });
};
