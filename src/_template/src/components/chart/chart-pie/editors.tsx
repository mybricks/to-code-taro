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
            label: "饼图",
            value: ChartType.Pie,
          },
          {
            label: "环形图",
            value: ChartType.Circle,
          },
        ],
      }),
      {
        title: "环形半径",
        type: "inputNumber",
        ifVisible({ data }: EditorResult<Data>) {
          return data.type === ChartType.Circle;
        },
        options: [
          { min: 0, max: 1, step: 0.05, title: "外环半径" },
          { min: 0, max: 1, step: 0.05, title: "内环半径" },
        ],
        value: {
          get({ data }: EditorResult<Data>) {
            return [data.radius ?? 1, data.innerRadius ?? 0.7];
          },
          set({ data }: EditorResult<Data>, value: number[]) {
            [data.radius, data.innerRadius] = value;
          },
        },
      },
      getNormalDataEditors({}),
      getLegendEditors({}),
      {
        title: "内容配置",
        ifVisible({ data }: EditorResult<Data>) {
          return data.type === ChartType.Circle;
        },
        items: [
          {
            title: "开启",
            type: "switch",
            value: {
              get({ data }: EditorResult<Data>) {
                return data.guide?.open ?? false;
              },
              set({ data, input, output }: EditorResult<Data>, value: string) {
                if (!data.guide) {
                  data.guide = {
                    title: "总计",
                  };
                }
                data.guide.open = value;
              },
            },
          },
          // {
          //   title: '标题文本',
          //   type: 'text',
          //   ifVisible({ data }: EditorResult<Data>) {
          //     return !!data.guide?.open
          //   },
          //   value: {
          //     get({ data }: EditorResult<Data>) {
          //       return data.guide?.title;
          //     },
          //     set({ data, input, output }: EditorResult<Data>, value: string) {
          //       data.guide.title = value
          //     }
          //   }
          // },
        ],
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
