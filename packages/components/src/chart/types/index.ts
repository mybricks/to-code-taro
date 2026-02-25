export enum ColumnChartType {
  Column = 'column',
  ColumnStack = 'column-stack',
  ColumnGroup = 'column-group'
}

export enum LineChartType {
  Line = 'line',
  LineMuti = 'line-muti',
}

export enum PieChartType {
  Pie = 'pie',
  /** 环形图 */
  Circle = 'circle'
}

export enum RadarChartType {
  Radar = 'radar',
  RadarMuti = 'radar-muti'
}

type _ChartType = LineChartType | ColumnChartType | PieChartType | RadarChartType

export const ChartType = { ...ColumnChartType, ...LineChartType, ...PieChartType, ...RadarChartType }

export const isGroupChart = (type: _ChartType) => {
  return [ChartType.ColumnGroup, ChartType.ColumnStack, ChartType.LineMuti].includes(type)
}