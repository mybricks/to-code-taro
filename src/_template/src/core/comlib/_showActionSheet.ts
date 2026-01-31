import Taro from "@tarojs/taro";

export type Item = {
  label: string;
  value?: any;
};

export type SelectItem = Item & {
  index?: number;
};

export type DataType = {
  itemList?: Item[];
};

export interface Inputs {
  showActionSheet?: (fn: (config?: DataType, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSelect: (value?: SelectItem) => void;
  onCancel: () => void;
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

  inputs.showActionSheet?.(async (val) => {
    let itemList: Item[] = data.itemList || [];
    try {
      if (Array.isArray(val)) {
        itemList = val;
      }

      Taro.showActionSheet({
        itemList: itemList.map((item) => item.label).slice(0, 6),
      })
        .then((res: any) => {
          // 点击按钮
          outputs["onSelect"]({
            index: res.tapIndex,
            label: itemList[res.tapIndex].label,
            value: itemList[res.tapIndex].value,
          });
        })
        .catch(() => {
          // 点击取消
          outputs["onCancel"]();
        });
    } catch (error: any) {
      console.error("显示 ActionSheet 失败:", error);
    }
  });
};
