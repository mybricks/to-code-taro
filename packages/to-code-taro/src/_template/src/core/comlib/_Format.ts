import dayjs from "dayjs";
import { FormatType } from "../tools/data-format";
import { isUndef, isString, isNumber, isDate } from "../tools/core";

export type DataType = {
  formatData: {
    voidHandle: boolean;
    voidTo: string;
    formatterName: keyof typeof FormatType;
    values: Record<keyof typeof FormatType, any>;
  };
};

export interface Inputs {
  call?: (fn: (config: any) => void) => void;
}

export interface Outputs {
  success: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

const transfromData = (value, formatType, config) => {
  let result = value;
  if (formatType === FormatType.NONE) {
    return result;
  }

  if (formatType === FormatType.KEYMAP) {
    return config?.[result] ?? result;
  }

  if (
    formatType === FormatType.TIME_TEMPLATE ||
    formatType === FormatType.TIME_CUSTOM
  ) {
    return dayjs(value).format(config);
  }

  return result;
};

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs?.["call"]?.((inputValue) => {
    let resValue = inputValue;

    const { formatterName, values } = data.formatData ?? {};

    if (isUndef(inputValue) && data?.formatData?.voidHandle) {
      resValue = data?.formatData?.voidTo;
      outputs["success"](resValue);
      return;
    }

    if (!isString(inputValue) && !isNumber(inputValue) && !isDate(inputValue)) {
      outputs["success"](resValue);
      return;
    }

    resValue = transfromData(
      inputValue,
      formatterName,
      values?.[formatterName],
    );
    outputs["success"](resValue);
    return;
  });
};
