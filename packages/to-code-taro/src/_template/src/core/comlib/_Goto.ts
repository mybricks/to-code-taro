import Taro from "@tarojs/taro";

export type DataType = {
  action?: "redirectTo" | "navigateTo" | "reLaunch";
};

export interface Inputs {
  goto?: (fn: (config: string, relOutputs?: any) => void) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;

  inputs.goto?.((val) => {
    try {
      if (data.action === "redirectTo") {
        Taro.redirectTo({
          url: val,
        });
      } else if (data.action === "navigateTo") {
        Taro.navigateTo({
          url: val,
        });
      } else if (data.action === "reLaunch") {
        Taro.reLaunch({
          url: val,
        });
      }
    } catch (error: any) {
      console.error("路由跳转失败:", error);
    }
  });
};
