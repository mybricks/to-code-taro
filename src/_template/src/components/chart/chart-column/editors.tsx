import {
  getNormalDataEditors,
  getLegendEditors,
  getChartTypeEditors,
} from "./../utils/editor";
import { ChartType } from "./../types";

export default {
  "@init"({ style }) {
    style.height = 400;
    style.width = "100%";
  },
  "@resize": {
    options: ["width", "height"],
  },
  ":root"({ data, output, style }, cate0, cate1, cate2) {
    cate0.title = "常规";
    cate0.items = [
      getChartTypeEditors({
        options: [
          {
            label: "柱状图",
            value: ChartType.Column,
          },
          {
            label: "堆叠柱状图",
            value: ChartType.ColumnStack,
          },
          {
            label: "分组柱状图",
            value: ChartType.ColumnGroup,
          },
        ],
      }),
      getNormalDataEditors({
        xFieldRotate: true,
        xFieldScrollable: true,
        yFieldDisplay: true,
      }),
      getLegendEditors({}),
      {},
      {
        title: "自定义 Tooltip",
        type: "switch",
        value: {
          get({ data }) {
            return data.useCustomTooltip;
          },
          set({ data, outputs }, value) {
            data.useCustomTooltip = value;

            if (value) {
              output.add("onTooltipShow", "Tooltip 显示", { type: "any" });
              output.add("onTooltipHide", "Tooltip 隐藏", { type: "any" });
            } else {
              output.remove("onTooltipShow");
              output.remove("onTooltipHide");
            }
          },
        },
      },
      {
        ifVisible({ data }) {
          return data.useCustomTooltip;
        },
        title: "Tooltip 显示",
        type: "_event",
        options: {
          outputId: "onTooltipShow",
        },
      },
      {
        ifVisible({ data }) {
          return data.useCustomTooltip;
        },
        title: "Tooltip 隐藏",
        type: "_event",
        options: {
          outputId: "onTooltipHide",
        },
      },
    ];

    cate1.title = "高级";
    cate1.items = [
      {
        title: "升级",
        type: "button",
        value: {
          set({ data, inputs, outputs }) {
            if (output.get("afterrender")) {
              return;
            }

            outputs.add("afterrender", "渲染完成", { type: "any" });
            inputs.get("data").setRels(["afterrender"]);
          },
        },
      },
    ];
  },
};
