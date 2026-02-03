import Taro from "@tarojs/taro";

export type DataType = {};

export type ValType = {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  scale?: number;
};

export interface Inputs {
  open?: (fn: (val: ValType) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  inputs: Inputs;
  outputs: Outputs;
}

const getNumber = (target: string | number) => {
  const _result = typeof target === "number" ? target : parseFloat(target);
  return isNaN(_result) ? 0 : _result;
};

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.open?.((val) => {
    try {
      Taro.openLocation({
        latitude: getNumber(val?.latitude),
        longitude: getNumber(val?.longitude),
        address: val?.address,
        name: val?.name,
        scale: val?.scale ?? 10,
        success: () => {
          outputs["onSuccess"]?.(true);
        },
        fail: ({ errMsg }: any) => {
          outputs["onFail"]?.({ errMsg });
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
