import Taro from "@tarojs/taro";

export type DataType = {};

export type ValType = {
  latitude?: number;
  longitude?: number;
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

export default (context: IOContext) => {
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.open?.((val) => {
    try {
      Taro.chooseLocation({
        latitude: val?.latitude,
        longitude: val?.longitude,
        success: (res: any) => {
          outputs["onSuccess"]?.({
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude,
          });
        },
        fail: (err: any) => {
          outputs["onFail"]?.(err);
        },
      });
    } catch (error: any) {
      console.error("地图选点失败:", error);
      outputs.onFail(error?.message || "地图选点失败");
    }
  });
};
