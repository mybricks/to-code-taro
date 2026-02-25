import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { ChartStatus, LoadStatus } from "./../components/chart-status";
import { useChart } from "./../utils/chartPie";
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

  const tickit = useRef(null);

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

    let _data: any[] = env.edit ? mockData : dataSource;

    const total = _data.reduce((a, c) => a + c?.[data.config.yField], 0);
    _data = _data.map((item) => {
      return {
        ...item,
        total: total,
      };
    });

    chart.source(_data);

    chart.tooltip(false);

    if (data.type === ChartType.Circle) {
      chart.coord("polar", {
        transposed: true,
        innerRadius: data.innerRadius ?? 0.7,
        radius: data.radius ?? 1,
      });
    } else if (data.type === ChartType.Pie) {
      chart.coord("polar", {
        transposed: true,
        radius: data.radius ?? 1,
      });
    }

    chart.axis(false);

    chart
      .interval()
      .position(`total*${data.config.yField}`)
      .color(data.config.xField)
      .adjust("stack")
      .style({
        lineWidth: 1,
        stroke: "#fff",
        lineJoin: "round",
        lineCap: "round",
      })
      .animate({
        appear: {
          duration: 1200,
          easing: "bounceOut",
        },
      });

    if (data.guide?.open && data.type === ChartType.Circle) {
      chart.pieLabel({
        sidePadding: 30,
        activeShape: true,
        lineStyle: {
          lineWidth: 0,
        },
        anchorStyle: {
          fill: "",
        },
        onClick(ev) {
          const itemData = ev.data;
          if (itemData) {
            // 设置 guíde，并重新渲染
            chart.guide().clear();

            chart.guide().text({
              position: ["50%", "46%"],
              content: itemData[data.config.xField],
              style: {
                fontSize: 13,
                textAlign: "center",
                fill: "#8C8C8C",
              },
            });

            chart.guide().text({
              position: ["50%", "54%"],
              content: "" + itemData[data.config.yField], // 类型转为字符串，避免出现数字异常
              style: {
                fontSize: 24,
                textAlign: "center",
                fontWeight: 500,
                fill: "#1F1F1F",
              },
            });

            chart.repaint();
          }
        },
      });
    }

    const legendConfig = getLegendFromData(data.config?.legend);
    if (!legendConfig) {
      chart.legend(false);
    } else {
      chart.legend(data.config.xField, legendConfig);
    }

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
    dataSource,
    data.type,
    data.radius,
    data.innerRadius,
    data.config.xField,
    data.config.yField,
    data.config?.legend,
    data.guide,
    data.guide?.open,
    data.guide?.title,

    tickit.current,
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
