export interface RingProgressProps {
  isShowLabel?: boolean;// 是否显示文字说明
  isShowSubLabel?: boolean;// 是否显示百分比
  labelDistance?: number; // 文字说明距离圆心的距离
  labelSize?: number; // 文字说明大小
  labelColor?: string; // 文字说明颜色
  subLabelSize?: number; // 百分比大小
  subLabelColor?: string; // 百分比颜色
  canvasContainerBorder?: string; // 画布容器边框
  canvasBorder?: string; // 画布边框
  /**
   * 进度百分比，范围 0-100
   */
  percent?: number;
  /**文字说明 */
  label?: string; 
  subLabel?: string; 
  /**
   * 环形进度条的尺寸
   */
  size?: number;
  /**
   * 环形进度条的宽度
   */
  strokeWidth?: number;
  /**
   * 进度条颜色
   */
  color?: string;
  /**
   * 背景色
   */
  backgroundColor?: string;
  /**
   * 自定义内容
   */
  children?: React.ReactNode;
} 