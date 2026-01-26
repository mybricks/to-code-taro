import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChartStatus, LoadStatus } from "./../components/chart-status";
import { useChart } from "./../utils/chart";
import { ChartType, isGroupChart } from "./../types";
import css from "./style.less";

export default function ({
  env,
  data,
  inputs,
  outputs,
  title,
  style,
  mockData = [],
}) {
  const { chart, Canvas, events, ...props } = useChart(env);

  const [dataSource, setDataSource] = useState(env.edit ? mockData : []);
  const [status, setStatus] = useState(LoadStatus.IDLE);

  const changeSize = useCallback(
    (width, height) => {
      if (!chart) {
        return;
      }
      chart.changeSize(width, height);
    },
    [chart]
  );

  useMemo(() => {
    inputs["loading"]?.((bool) => {
      setStatus(LoadStatus.LOADING);
    });

    inputs["noMore"]?.((bool) => {
      setStatus(LoadStatus.NOMORE);
    });

    inputs["error"]?.((bool) => {
      setStatus(LoadStatus.ERROR);
    });

    inputs["data"]((val) => {
      if (Array.isArray(val)) {
        setDataSource(val);
        setStatus(LoadStatus.IDLE);
      }
    });
  }, []);

  useEffect(() => {
    if (!chart) {
      return;
    }

    chart.clear();

    chart.source(env.edit ? mockData : dataSource);

    chart.tooltip(false);
    chart.coord("polar");
    chart.axis(data.config.yField);

    const color = isGroupChart(data.type) ? data.config.seriesField : false;

    chart
      .line()
      .position(`${data.config.xField}*${data.config.yField}`)
      .color(color)
      .shape(data?.geo?.line?.smooth ? "smooth" : "line")
      .animate({
        appear: {
          animation: "groupWaveIn",
        },
      });

    if (data.geo.dot?.show) {
      chart
        .point()
        .position(`${data.config.xField}*${data.config.yField}`)
        .color(color)
        .animate({
          appear: {
            animation: "groupWaveIn",
          },
        })
        .style({
          stroke: "#fff",
          lineWidth: 1,
        });
    }

    if (data.geo.area?.show) {
      chart
        .area()
        .position(`${data.config.xField}*${data.config.yField}`)
        .color(color)
        .animate({
          appear: {
            animation: "groupWaveIn",
          },
        });
    }

    const legendConfig = getLegendFromData(data.config?.legend);
    if (!legendConfig) {
      chart.legend(false);
    } else {
      chart.legend(data.config.xField, legendConfig);
    }

    chart.render();
  }, [
    chart,
    mockData,
    dataSource,
    data.type,
    data.config.seriesField,
    data.config.xField,
    data.config.yField,
    data.config?.legend,

    data.geo?.line,
    data.geo?.dot,
    data.geo?.area,
  ]);

  return (
    <ChartStatus env={env} status={status} {...events} onResize={changeSize}>
      <Canvas className={css.chart_line} {...props} />
    </ChartStatus>
  );
}

function getColorFromData(config) {}

function getLegendFromData(legendConfig) {
  if (!legendConfig) {
    return false;
  }

  let result = {};
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
          position: legendConfig.position,
        };
        break;
    }
  }

  return { ...result, ...posParams };
}
