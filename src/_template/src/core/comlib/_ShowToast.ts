import Taro from "@tarojs/taro";

export type DataType = {
  dynamic?: boolean;
  title?: string;
  duration?: number;
  mask?: boolean;
  asynchronous?: boolean;
  icon?: "success" | "error" | "loading" | "none";
  image?: string;
};

export interface Inputs {
  showToast?: (
    fn: (config: DataType | string, relOutputs?: any) => void,
  ) => void;
}

export interface Outputs {
  afterShowToast: (value?: any) => void;
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

  inputs.showToast?.((val: DataType | string) => {
    console.log(111, context);
    try {
      /** 动态输入 */
      if (data?.dynamic) {
        Taro.showToast({
          ...(typeof val === "string"
            ? {
                title: val ?? "",
                duration: 1000,
              }
            : {
                ...val,
                title: val.title ?? "",
                duration: !val.duration
                  ? 1000
                  : typeof val.duration === "string"
                    ? Number(val.duration)
                    : val.duration,
              }),
          complete: () => {
            if (data.asynchronous) {
              setTimeout(() => {
                outputs["afterShowToast"]();
              }, data?.duration); //提示结束后触发
            } else {
              outputs["afterShowToast"](val);
            }
          },
        });
      } else {
        /** 非动态输入 */
        Taro.showToast({
          ...data,
          title: data.title ?? "",
          complete: () => {
            if (data.asynchronous) {
              setTimeout(() => {
                outputs["afterShowToast"]();
              }, data?.duration); //提示结束后触发
            } else {
              outputs["afterShowToast"](val);
            }
          },
        });
      }
    } catch (error) {
      console.error("显示 Toast 失败:", error);
    }
  });
};
