import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { ChartStatus, LoadStatus } from "./../components/chart-status";
import { useChart, getChartConfigFromData } from "./../utils/chartLine";
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

  const [dataSource, setDataSource] = useState([]);
  const [status, setStatus] = useState(LoadStatus.IDLE);

  const tickit = useRef(null);

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

    inputs["data"]((val, outputRels) => {
      if (Array.isArray(val)) {
        tickit.current = outputRels["afterrender"];

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

    let sourceParams = {};
    if (data.config.xFieldScrollable) {
      sourceParams[data.config.xField] = {
        values: (env.edit ? mockData : dataSource)
          .slice(0, data.config.xFieldCount || 10)
          .map((d) => d[data.config.xField]),
      };
    }

    chart.source(env.edit ? mockData : dataSource, {
      ...sourceParams,
    });

    // 配置 X 轴标签的旋转角度
    if (data.config.xFieldRotate) {
      chart.axis(data.config.xField, {
        label: function (text, index, total) {
          const cfg = {
            rotate: Math.PI / data.config.xFieldRotate, // 45度
            textAlign: "start",
          };
          return cfg;
        },
      });
    }

    const { legend } = getChartConfigFromData(data);

    const color = isGroupChart(data.type) ? data.config.seriesField : "";

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
        .style({
          stroke: "#fff",
          lineWidth: 1,
        })
        .animate({
          appear: {
            animation: "groupWaveIn",
          },
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

    // 定义进度条
    if (data.config.xFieldScrollable) {
      chart.interaction("pan");

      chart.scrollBar({
        mode: "x",
        xStyle: {
          offsetY: -5,
        },
      });
    }

    if (data.config.yFieldDisplay) {
      chart.guide().text({
        position: ["min", "max"], // 位置为 Y 轴的顶部
        content: data.config.yField, // 名称内容
        style: {
          textAlign: "center",
          textBaseline: "bottom",
          fontSize: 12,
          fill: "#808080",
        },
        offsetY: -12, // 向上偏移，避免与 Y 轴的刻度重叠
      });
    }

    if (data.useCustomTooltip) {
      // 自定义 tooltip
      chart.tooltip({
        custom: true,
        onShow: (ev) => {
          let result;
          if (ev.items.length > 1) {
            result = ev.items;
          } else {
            result = ev.items[0];
          }

          outputs["onTooltipShow"]?.(result);
        },
        onHide: () => {
          outputs["onTooltipHide"]?.();
        },
      });
    }

    chart.legend(...legend);

    // 监听 afterrender 事件
    chart.on("afterrender", () => {
      console.log("图表渲染完成");
      if (typeof tickit.current === "function") {
        tickit.current();
        tickit.current = null;
      }
    });

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

    data.config.xFieldScrollable,
    data.config.xFieldCount,
    data.config.xFieldRotate,
    data.config.yFieldDisplay,

    tickit.current,
  ]);

  return (
    <ChartStatus status={status} {...events}>
      <Canvas className={css.chart_line} {...props} />
    </ChartStatus>
  );
}
