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

export interface Env {
  apiKey?: string;
}

interface IOContext {
  env: Env;
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const env: Env = context.env;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.open?.((val) => {
    try {
      if (!val?.longitude || !val?.latitude) {
        outputs["onFail"]?.({ errMsg: "不合法的经纬度信息" });
        return;
      }
      const url = `https://apis.map.qq.com/ws/geocoder/v1/?key=${env?.apiKey ?? "WDOBZ-7WZWL-NFJPE-EKBHS-PBEEK-U4FA5"}&location=${val?.latitude},${val?.longitude}&get_poi=0`;
      Taro.request({
        url,
        success: (res: any) => {
          if (res.statusCode === 200 && res.data.status === 0) {
            const { result } = res.data ?? {};
            outputs["onSuccess"]?.({
              name: result?.formatted_addresses?.recommend,
              address: result?.address,
              longitude: val.longitude,
              latitude: val.latitude,
              ...(result?.address_component ?? {}),
            });
          } else {
            outputs["onFail"]?.({
              errMsg: res.data?.message ?? res.errMsg ?? "网络错误",
            });
          }
        },
        fail: ({ errMsg }: any) => {
          outputs["onFail"]?.({ errMsg });
        },
      });
    } catch (error: any) {
      console.error("地图选点失败:", error);
      outputs.onFail(error?.message || "地图选点失败");
    }
  });
};
