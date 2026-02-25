import Taro from "@tarojs/taro";

export type DataType = {
  text: string;
};

export interface Inputs {
  /** 显示模态对话框 */
  setClipboardData?: (fn: (config?: string, relOutputs?: any) => void) => void;
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

  inputs.setClipboardData?.(async (val) => {
    let copyText = data.text;

    if (val) {
      copyText = val;
    }

    // 非字符串尝试转换
    if (typeof copyText !== "string") {
      try {
        copyText = JSON.stringify(copyText);
      } catch (error) {
        outputs["onFail"]("请输入字符串");
      }
    }

    Taro.setClipboardData({
      data: copyText,
      success: () => {
        outputs["onSuccess"](copyText);
      },
      fail: (err: any) => {
        outputs["onFail"](err);
      },
    });
  });
};
