import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import * as Taro from '@tarojs/taro';
import { createSelectorQuery } from '@tarojs/taro'
import { View } from '@tarojs/components';
import RingProgress from "./../components/ring-progress";
import { useChart } from "./../utils/chart";
import { ChartType, isGroupChart } from './../types'
import { Base64 } from 'js-base64'
import css from "./style.less";
const isWeapp = (Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === 'weapp2');
// 判断是否为小程序环境  最新小程序类型 是 weapp2
export default function ({
  env,
  data,
  inputs,
  outputs,
  title,
  style,
  mockData = [],
  logger
}) {
  const [value, setValue] = useState(data.value)
  const [label, setLabel] = useState(data.label)
  const [config, setConfig] = useState<any>(data.config)
  inputs["data"]((val) => {

    logger.info("🚀 ~ inputs['data'] ~ val:", val)
    const { value, label, config } = val
    setValue(value)
    setLabel(label)
    setConfig(config)
  });

  return (
    // 自定义样式
    <RingProgress
      percent={value}
      size={config.size}
      strokeWidth={config.strokeWidth}
      color={config.color}
      backgroundColor={config.backgroundColor}
      isShowLabel={config.isShowLabel}
      isShowSubLabel={config.isShowSubLabel}
      labelDistance={config.labelDistance}
      labelSize={config.labelSize}
      labelColor={config.labelColor}
      subLabelSize={config.subLabelSize}
      subLabelColor={config.subLabelColor}
      label={config.label}
      subLabel={config.subLabel}
      canvasContainerBorder={config.canvasContainerBorder}
      canvasBorder={config.canvasBorder}
      // {...config}
    >
      {/* <View>{value}</View>
      <View>{label}</View> */}
    </RingProgress>
  );
}
