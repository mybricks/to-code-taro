import { isGroupChart } from './../../types'

/**
 * @description 获取真实的图表配置
 */
export function getChartConfigFromData(data) {
  return {
    legend: getLegendFromData(data.config.legend, {
      field: isGroupChart(data.type) ? data.config.seriesField : data.config.xField,
    })
  }
}

function getLegendFromData (legendConfig, { field }) {
  if (!legendConfig) {
    return [false];
  }

  let result = {}
  let posParams = {};

  if (legendConfig.position) {
    switch (legendConfig.position) {
      case "top-left":
        posParams = {
          position: "top",
          align: "left",
        };
        break;
      case "top":
        posParams = {
          position: "top",
          align: "center",
        };
        break;
      case "top-right":
        posParams = {
          position: "top",
          align: "right",
        };
        break;
      case "bottom-left":
        posParams = {
          position: "bottom",
          align: "left",
        };
        break;
      case "bottom":
        posParams = {
          position: "bottom",
          align: "center",
        };
        break;
      case "bottom-right":
        posParams = {
          position: "bottom",
          align: "right",
        };
        break;
      default:
        posParams = {
          position: legendConfig.position
        }
        break;
    }
  }

  return [field, { ...result, ...posParams }]
}
