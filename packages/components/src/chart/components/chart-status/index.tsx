import React, { useEffect, useRef } from "react";
import { View } from "@tarojs/components";
import css from "./index.less";

const Empty = () => {
  return <View className={css.chart_wrap_empty}>暂无数据</View>;
};

const Loading = () => {
  return <View className={css.chart_wrap_loading}>加载中</View>;
};

export const ChartStatus = ({
  env,
  className,
  children,
  status = LoadStatus.IDLE,
  onResize,
  ...props
}: {
  className?;
  children?;
  status?;
  onResize?: (width: number, height: number) => void;
  [keyname: string]: any;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听容器尺寸变化
  let resizeTimer: any;
  useEffect(() => {
    if (!containerRef.current || !env.edit) return;

    // 使用 ResizeObserver 监听尺寸变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // 防抖处理
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          onResize?.(width, height);
        }, 200);
      }
    });

    resizeObserver.observe(containerRef.current);

    // 组件卸载时清理
    return () => {
      resizeObserver.disconnect();
    };
  }, [onResize]);

  return (
    <View
      ref={containerRef}
      className={`${css.chart_wrap} ${className}`}
      {...props}
    >
      {status === LoadStatus.LOADING && <Loading />}
      {status === LoadStatus.NOMORE && <Empty />}
      {children}
    </View>
  );
};

export enum LoadStatus {
  IDLE = "idle",
  LOADING = "loading",
  ERROR = "error",
  NOMORE = "noMore",
}

export default ChartStatus;
