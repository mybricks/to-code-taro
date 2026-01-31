import Taro from "@tarojs/taro";

export type DataType = {
  timeout?: number;
};

export interface Inputs {
  call?: (fn: () => void) => void;
}

export interface Outputs {
  success: (value?: any) => void;
  fail: (value?: any) => void;
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

  inputs.call?.(() => {
    try {
      let params = {};

      if (!!data.timeout) {
        params["timeout"] = data.timeout;
      }

      Taro.login({
        ...params,
        success: (res) => {
          if (res.code) {
            outputs["success"]({
              code: res.code,
            });
          } else {
            outputs["fail"]({
              ...res,
            });
          }
        },
        fail: (res) => {
          outputs["fail"]({
            ...res,
          });
        },
      });
    } catch (error) {
      console.error("获取登录凭证失败:", error);
    }
  });
};
