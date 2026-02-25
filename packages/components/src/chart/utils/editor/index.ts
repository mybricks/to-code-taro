import { ChartType, isGroupChart } from "./../../types";

export const getChartTypeEditors = ({ options }) => {
  return {
    title: "类型",
    type: "Select",
    options: options,
    value: {
      get({ data }: EditorResult<Data>) {
        return data.type;
      },
      set({ data, input, output }: EditorResult<Data>, value: string) {
        if (isGroupChart(value as any)) {
          if (!data.config?.seriesField) {
            data.config.seriesField = "type";
          }
        }

        data.type = value;

        // if (value === 'step') {
        //   data.config = {
        //     ...data.config,
        //     stepType: 'vh',
        //     seriesField: ''
        //   };
        // } else if (value === 'more') {
        //   data.config = {
        //     ...data.config,
        //     stepType: '',
        //     seriesField: data.config.seriesField || 'category'
        //   };
        // } else {
        //   data.config = {
        //     ...data.config,
        //     stepType: '',
        //     seriesField: ''
        //   };
        // }
        // setSchema(data, input, output);
      },
    },
  };
};

export const getNormalDataEditors = (config) => {
  return {
    title: "数据映射",
    items: [
      {
        title: "x横轴字段名",
        type: "Text",
        description: "横轴映射对应的数据字段名",
        value: {
          get({ data }: EditorResult<Data>) {
            return data.config.xField || "label";
          },
          set({ data, input, output }: EditorResult<Data>, value: string) {
            data.config.xField = value;
            // setSchema(data, input, output);
          },
        },
      },
      {
        ifVisible({ data }) {
          return [
            ChartType.Column,
            ChartType.ColumnStack,
            ChartType.ColumnGroup,
            ChartType.Line,
            ChartType.LineMuti,
          ].includes(data.type);
        },
        title: "x轴刻度线的条数",
        description: "0显示全部",
        type: "text",
        options: {
          type: "number",
        },
        value: {
          get({ data }) {
            return data.config.xFieldTickCount || 0;
          },
          set({ data }, value) {
            data.config.xFieldTickCount = value;
          },
        },
      },
      {
        ifVisible({ data }) {
          return config.xFieldScrollable;
        },
        title: "x横轴支持平移",
        type: "Switch",
        value: {
          get({ data }) {
            return data.config.xFieldScrollable;
          },
          set({ data }, value) {
            data.config.xFieldScrollable = value;
          },
        },
      },
      {
        ifVisible({ data }) {
          return data.config.xFieldScrollable;
        },
        title: "每屏展示个数",
        type: "text",
        options: {
          type: "number",
        },
        value: {
          get({ data }) {
            return data.config.xFieldCount;
          },
          set({ data }, value) {
            data.config.xFieldCount = value;
          },
        },
      },
      {
        ifVisible({ data }) {
          return config.xFieldRotate;
        },
        title: "x轴顺时针旋转角度",
        type: "radio",
        options: [
          { label: "不旋转", value: 0 },
          { label: "45度", value: 4 },
          { label: "90度", value: 2 },
        ],
        value: {
          get({ data }) {
            return data.config.xFieldRotate || 0;
          },
          set({ data }, value) {
            data.config.xFieldRotate = value;
          },
        },
      },
      {
        title: "y纵轴字段名",
        type: "Text",
        description: "纵轴映射对应的数据字段名",
        value: {
          get({ data }: EditorResult<Data>) {
            return data.config.yField || "value";
          },
          set({ data, input, output }: EditorResult<Data>, value: string) {
            data.config.yField = value;
            // setSchema(data, input, output);
          },
        },
      },
      {
        ifVisible({ data }) {
          return config.yFieldDisplay;
        },
        title: "Y 轴显示字段名",
        type: "switch",
        value: {
          get({ data }) {
            return data.config.yFieldDisplay;
          },
          set({ data }, value) {
            data.config.yFieldDisplay = value;
          },
        },
      },
      {
        title: "分组字段名",
        type: "Text",
        description: "聚合维度对应的数据字段名",
        ifVisible({ data }) {
          return [
            ChartType.ColumnGroup,
            ChartType.ColumnStack,
            ChartType.LineMuti,
          ].includes(data.type);
        },
        value: {
          get({ data }: EditorResult<Data>) {
            return data.config.seriesField || "type";
          },
          set({ data, input, output }: EditorResult<Data>, value: string) {
            data.config.seriesField = value;
            // setSchema(data, input, output);
          },
        },
      },
    ],
  };
};

export const getLegendEditors = ({}) => {
  return {
    title: "图例",
    // ifVisible({ data }: EditorResult<Data>) {
    //   console.log(data.type)
    //   return [ChartType.Column, ChartType.ColumnStack, ChartType.ColumnGroup, ChartType.LineMuti].includes(data.type);
    // },
    items: [
      {
        title: "图例",
        type: "Switch",
        value: {
          get({ data }: EditorResult<Data>) {
            if (typeof data.config.legend === "boolean") {
              return data.config.legend;
            } else {
              return true;
            }
          },
          set({ data }: EditorResult<Data>, value: boolean) {
            if (!value) {
              data.config.legend = false;
            } else {
              data.config.legend = { position: "right" };
            }
          },
        },
      },
      // {
      //   title: '单击图例复制名称',
      //   type: 'Switch',
      //   ifVisible({ data }: EditorResult<Data>) {
      //     return !!data.config.legend;
      //   },
      //   value: {
      //     get({ data }: EditorResult<Data>) {
      //       return data.copyLegendTextOnClick;
      //     },
      //     set({ data }: EditorResult<Data>, value: boolean) {
      //       data.copyLegendTextOnClick = value;
      //     }
      //   }
      // },
      {
        title: "位置",
        type: "Select",
        ifVisible({ data }: EditorResult<Data>) {
          return !!data.config.legend;
        },
        options: [
          { label: "左上", value: "top-left" },
          { label: "顶部", value: "top" },
          { label: "右上", value: "top-right" },
          { label: "底部", value: "bottom" },
          { label: "左下", value: "bottom-left" },
          { label: "左侧", value: "left" },
          { label: "右下", value: "bottom-right" },
          { label: "右侧", value: "right" },
        ],
        value: {
          get({ data }: EditorResult<Data>) {
            if (typeof data.config.legend === "boolean") {
              return data.config.legend;
            }

            return data.config.legend?.position;
          },
          set({ data }: EditorResult<Data>, value: any) {
            if (typeof data.config.legend !== "boolean") {
              data.config.legend.position = value;
              data.config.legend = { ...data.config.legend };
            }
          },
        },
      },
      // {
      //   title: 'x轴方向偏移',
      //   type: 'text',
      //   ifVisible({ data }: EditorResult<Data>) {
      //     return !!data.config.legend;
      //   },
      //   value: {
      //     get({ data }: EditorResult<Data>) {
      //       return data.config.legend.offsetX;
      //     },
      //     set({ data }: EditorResult<Data>, value: string) {
      //       data.config.legend.offsetX = Number(value);
      //       data.config.legend = { ...data.config.legend };
      //     }
      //   }
      // },
      // {
      //   title: 'y轴方向偏移',
      //   type: 'text',
      //   ifVisible({ data }: EditorResult<Data>) {
      //     return !!data.config.legend;
      //   },
      //   value: {
      //     get({ data }: EditorResult<Data>) {
      //       return data.config.legend.offsetY;
      //     },
      //     set({ data }: EditorResult<Data>, value: string) {
      //       data.config.legend.offsetY = Number(value);
      //       data.config.legend = { ...data.config.legend };
      //     }
      //   }
      // }
    ],
  };
};

export const getGeoEditors = ({}) => {
  return {
    title: "图形配置",
    items: [
      {
        title: "线条",
        catelog: "线条",
        items: [
          {
            title: "展示",
            type: "switch",
            value: {
              get({ data }: EditorResult<Data>) {
                return !!data.geo?.line?.show;
              },
              set({ data, input, output }: EditorResult<Data>, value: string) {
                data.geo.line = {
                  ...data.geo.line,
                  show: value,
                };
              },
            },
          },
          {
            title: "顺滑曲线",
            type: "switch",
            value: {
              get({ data }: EditorResult<Data>) {
                return !!data.geo?.line?.smooth;
              },
              set({ data, input, output }: EditorResult<Data>, value: string) {
                data.geo.line = {
                  ...data.geo.line,
                  smooth: value,
                };
              },
            },
          },
        ],
      },
      {
        title: "节点",
        catelog: "节点",
        items: [
          {
            title: "展示",
            type: "switch",
            value: {
              get({ data }: EditorResult<Data>) {
                return !!data.geo?.dot?.show;
              },
              set({ data, input, output }: EditorResult<Data>, value: string) {
                data.geo.dot = {
                  ...data.geo.dot,
                  show: value,
                };
              },
            },
          },
        ],
      },
      {
        title: "面积",
        catelog: "面积",
        items: [
          {
            title: "展示",
            type: "switch",
            value: {
              get({ data }: EditorResult<Data>) {
                return !!data.geo?.area?.show;
              },
              set({ data, input, output }: EditorResult<Data>, value: string) {
                data.geo.area = {
                  ...data.geo.area,
                  show: value,
                };
              },
            },
          },
        ],
      },
    ],
  };
};
