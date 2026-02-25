import Taro from "@tarojs/taro";

export type DataType = {
  onlyFromCamera?: boolean;
};

export interface Inputs {
  scan?: (fn: () => void) => void;
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

  inputs.scan?.(() => {
    try {
      Taro.scanCode({
        onlyFromCamera: data.onlyFromCamera,
        success: ({ result, scanType }) => {
          if (result) {
            outputs["onSuccess"]?.({ result, scanType });
          } else {
            outputs["onFail"]?.({});
          }
        },
        fail: ({ errMsg }) => {
          outputs["onFail"]?.({ errMsg });
        },
      });
    } catch (error: any) {
      console.error("扫码失败:", error);
      outputs.onFail(error?.message || "扫码失败");
    }
  });
};
