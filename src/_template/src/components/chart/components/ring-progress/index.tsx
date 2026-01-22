import React, { useEffect, useRef } from 'react';
import * as Taro from '@tarojs/taro';
import { View, Canvas } from '@tarojs/components';
import { RingProgressProps } from './types';
import './style.less';
function uuid(pre = "c_", len = 6) {
  const seed = "abcdefhijkmnprstwxyz0123456789",
    maxPos = seed.length;
  let rtn = "";
  for (let i = 0; i < len; i++) {
    rtn += seed.charAt(Math.floor(Math.random() * maxPos));
  }
  return pre + rtn;
}
function isDesigner(env): Boolean {
  if (env?.edit || env?.runtime?.debug) {
    return true;
  } else {
    return false;
  }
}
function createWebCanvas(canvasRef: any, size: number,
  strokeWidth: number, percent: number, color: string,
  backgroundColor: string, isShowLabel: boolean, labelSize: number,
  labelColor: string, label: string, isShowSubLabel: boolean,
  subLabelSize: number, subLabelColor: string, subLabel: string, labelDistance: number) {
  // const canvas:any = document.getElementById("#"+canvasId);
  console.log("🚀 ~ createWebCanvas ~ canvasRef:", canvasRef)
  const canvas = canvasRef.current;
  // const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const pixelRatio = window.devicePixelRatio
  console.log("🚀 ~ createWebCanvas ~ pixelRatio:", pixelRatio,canvas)
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  const ctx = canvas.getContext('2d');
  // 计算中心点和半径
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = (canvas.width - strokeWidth) / 2;

  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制背景圆环
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = backgroundColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // 绘制进度圆环
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * percent) / 100;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.stroke();


  // 绘制文字
  if (isShowLabel) {
    ctx.beginPath();
    ctx.font = `${labelSize}px`;
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label}`, centerX, centerY);
    ctx.stroke();
  }
  if (isShowSubLabel) {
    ctx.beginPath();
    ctx.font = `${subLabelSize}px`;
    ctx.fillStyle = subLabelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${subLabel}`, centerX, centerY + labelDistance);
    ctx.stroke();
  }

}
function createTaroCanvas(canvasId: string, size: number,
  strokeWidth: number, percent: number, color: string,
  backgroundColor: string, isShowLabel: boolean, labelSize: number,
  labelColor: string, label: string, isShowSubLabel: boolean,
  subLabelSize: number, subLabelColor: string, subLabel: string, labelDistance: number) {
  const query = Taro.createSelectorQuery();
  query.select('.mybricks_com >>> .' + canvasId)
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');


      // 设置canvas尺寸

      console.log("🚀 ~ .exec ~ pixelRatio:", pixelRatio, canvas)
      canvas.width = size * pixelRatio;
      canvas.height = size * pixelRatio;
      // canvas.width = size;
      // canvas.height = size;

      // 计算中心点和半径
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = (canvas.width - strokeWidth) / 2;

      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制背景圆环
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = backgroundColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // 绘制进度圆环
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * percent) / 100;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.stroke();


      // 绘制文字
      if (isShowLabel) {
        ctx.beginPath();
        ctx.font = `${labelSize}px`;
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${label}`, centerX, centerY);
        ctx.stroke();
      }
      if (isShowSubLabel) {
        ctx.beginPath();
        ctx.font = `${subLabelSize}px`;
        ctx.fillStyle = subLabelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${subLabel}`, centerX, centerY + labelDistance);
        ctx.stroke();
      }
    });
}
const isWeapp = (Taro.getEnv() === Taro.ENV_TYPE.WEAPP || Taro.getEnv() === 'weapp2');

const pixelRatio = Taro.getSystemInfoSync().pixelRatio;
const RingProgress: React.FC<RingProgressProps> = ({
  isShowLabel = true,
  isShowSubLabel = true,
  labelDistance = 10,
  labelSize = 14,
  labelColor = '#eee',
  subLabelSize = 30,
  subLabelColor = '#000',
  label = "",
  subLabel = "",
  percent = 0,
  size = 120,
  strokeWidth = 8,
  color = '#1890ff',
  backgroundColor = '#f5f5f5',
  canvasBorder='',
  canvasContainerBorder='',
  children
}) => {
  // const pixelRatioSize = size * pixelRatio;
  const canvasRef: any = useRef<HTMLElement>(null);
  const canvasId = uuid('ring-progress-canvas', 6)
  useEffect(() => {
    if (!isWeapp) {
      createWebCanvas(canvasRef, size, strokeWidth, percent, color, backgroundColor, isShowLabel, labelSize, labelColor, label, isShowSubLabel, subLabelSize, subLabelColor, subLabel, labelDistance);
    } else {
      createTaroCanvas(canvasId, size, strokeWidth, percent, color, backgroundColor, isShowLabel, labelSize, labelColor, label, isShowSubLabel, subLabelSize, subLabelColor, subLabel, labelDistance);
    }


  }, [percent, size, strokeWidth, color, backgroundColor]);

  return (
    <View className="ring-progress" 
    style={{ width: '100%', height: '100%',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border:canvasContainerBorder }}>
      {isWeapp ?

        (<Canvas
          type="2d"
          id={canvasId}
          canvasId={canvasId}
          className={`ring-progress-canvas ${canvasId}`}
          style={{ width: `${size}px`, height: `${size}px`,border:canvasBorder }}
        />) :
        (<canvas ref={canvasRef} id={canvasId} 
          width={size} height={size}
          style={{border:canvasBorder}} />
          // { width: `${size}px`, height: `${size}px` }

        )}


      {/* {children && <View className="ring-progress-content">{children}</View>} */}
    </View>
  );
};

export default RingProgress;