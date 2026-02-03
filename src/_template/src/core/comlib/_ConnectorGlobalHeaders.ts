import * as Taro from "@tarojs/taro";

export type DataType = {
  dynamic?: boolean;
  header?: Record<string, string>;
};

export interface Inputs {
  call?: (fn: (config: DataType["header"], relOutputs?: any) => void) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;

  inputs.call?.((obj, outputRels) => {
    try {
      if (data.dynamic == true || data.dynamic == void 0) {
        if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
          Taro.setStorageSync("_MYBRICKS_GLOBAL_HEADERS_", obj);
          outputRels["then"](obj);
        }
      } else {
        if (
          typeof data.header === "object" &&
          data.header !== null &&
          !Array.isArray(data.header)
        ) {
          Taro.setStorageSync("_MYBRICKS_GLOBAL_HEADERS_", data.header);
          outputRels["then"](data.header);
        }
      }
    } catch (error: any) {
      console.error("设置全局请求头失败:", error);
    }
  });
};
