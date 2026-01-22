import { ChartType, isGroupChart } from './../types'

export const MockData = {
  default: [
    { label: '1991', value: 3 },
    { label: '1992', value: 4 },
    { label: '1993', value: 3.5 },
    { label: '1994', value: 5 },
    { label: '1995', value: 4.9 },
    { label: '1996', value: 6 },
    { label: '1997', value: 7 },
    { label: '1998', value: 9 },
    { label: '1999', value: 13 }
  ],
  group: [
    { label: '1991', value: 3, type: 'London' },
    { label: '1992', value: 4, type: 'London' },
    { label: '1993', value: 3.5, type: 'London' },
    { label: '1994', value: 5, type: 'London' },
    { label: '1995', value: 4.9, type: 'London' },
    { label: '1996', value: 6, type: 'London' },
    { label: '1997', value: 7, type: 'London' },
    { label: '1998', value: 9, type: 'London' },
    { label: '1999', value: 13, type: 'London' },
    { label: '1991', value: 1, type: 'Paris' },
    { label: '1992', value: 3, type: 'Paris' },
    { label: '1993', value: 4.6, type: 'Paris' },
    { label: '1994', value: 5, type: 'Paris' },
    { label: '1995', value: 8, type: 'Paris' },
    { label: '1996', value: 13, type: 'Paris' },
    { label: '1997', value: 12, type: 'Paris' },
    { label: '1998', value: 19, type: 'Paris' },
    { label: '1999', value: 20, type: 'Paris' },
  ],
  percent: [
    { label: '极氪001', value: 60 },
    { label: '小米su7', value: 30 },
    { label: 'model3', value: 90 },
    { label: '小鹏P7i', value: 5 },
    { label: '蔚来ET5', value: 17 },
    { label: '海豹', value: 13 },
  ]
}


/**
 *
 * @param arr 原数据
 * @param Field 新key 按 x,y,分类
 * @param defaultKey 原数据key 按 x,y,分类
 * @returns
 */
export const changeMockDataField = (
  arr: Array<Record<string, any>>,
  Field: { xField: string; yField: string; seriesField?: string },
  defaultKey?: { x?: string; y?: string; category?: string }
): Array<Record<string, any>> => {
  const { xField, yField, seriesField } = Field;
  const { x = 'label', y = 'value', category = 'type' } = defaultKey || {};

  return arr.map((item) => ({
    [xField]: item[x],
    [yField]: item[y],
    [seriesField]: item?.[category]
  }));
};


export const mockLineChart = (config) => {
  return changeMockDataField(MockData.default, config)
}


export const mockPieChart = (chartType, data) => {
  return changeMockDataField(MockData.percent, data.config);
}

export const mockChart = (chartType, data) => {
  return changeMockDataField(isGroupChart(chartType) ? MockData.group : MockData.default, data.config)
}