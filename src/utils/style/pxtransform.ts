/**
 * px 转 rpx 适配方法
 * 用于 Taro/小程序样式转换
 * 
 * 转换规则：
 * - 如果 px 值 <= MIN_PX_THRESHOLD，保持为 px（避免 1px 边框等问题）
 * - 否则转换为 rpx（px * 2，基于 375px 设计稿）
 * 
 * 注意：Taro 中 rpx 需要作为字符串使用，如 "20rpx"
 */

/** 最小 px 阈值，小于等于此值的 px 不转换为 rpx */
export const MIN_PX_THRESHOLD = 1;

/** rem 基准值，默认 px = 1rem */
export const REM_BASE = 20;

/**
 * 检查值是否是 px 格式（数字+px 或纯数字）
 * @param value - 样式值
 * @returns 如果是 px 格式返回 true，否则返回 false
 */
function isPxValue(value: string | number): boolean {
  if (typeof value === "number") {
    return true; // 纯数字视为 px
  }
  if (typeof value === "string") {
    // 匹配 "数字px" 格式
    const regex = /^(\d*\.?\d+)px$/;
    return regex.test(value);
  }
  return false;
}

/**
 * 将 px 值转换为 rpx（用于 Taro 小程序）
 * @param value - 样式值，可以是字符串（如 "10px"）或数字（如 10）
 * @returns 转换后的值，字符串类型（如 "20rpx"）或数字（如 1，用于小于等于 MIN_PX_THRESHOLD 的情况）
 */
export function pxToRpx(value: string | number): string | number {
  // 如果是数字
  if (typeof value === "number") {
    // 小于等于 MIN_PX_THRESHOLD 的保持原值（作为 px，返回数字）
    if (value <= MIN_PX_THRESHOLD) {
      return value;
    }
    // 其他值转换为 rpx 字符串
    return `${value * 2}rpx`;
  }

  // 如果是字符串
  if (typeof value === "string") {
    // 匹配 "数字px" 格式
    const regex = /^(\d*\.?\d+)px$/;
    const match = value.match(regex);
    
    if (match) {
      const pxValue = parseFloat(match[1]);
      // 小于等于 MIN_PX_THRESHOLD 的保持为 px（返回数字，React 会自动添加 "px"）
      if (pxValue <= MIN_PX_THRESHOLD) {
        return pxValue;
      }
      // 其他值转换为 rpx 字符串
      return `${pxValue * 2}rpx`;
    }
    
    // 如果不包含 px，可能是百分比或其他单位，保持原样
    return value;
  }

  return value;
}


/**
 * 将 px 值转换为 rem（用于 H5/Web）
 * @param value - 样式值，可以是字符串（如 "16px"）或数字（如 16）
 * @returns 转换后的值，字符串类型（如 "1rem"）或数字（如 1，用于小于等于 MIN_PX_THRESHOLD 的情况）
 */
export function pxToRem(value: string | number): string | number {
  // 如果是数字
  if (typeof value === "number") {
    // 小于等于 MIN_PX_THRESHOLD 的保持原值（作为 px，返回数字）
    if (value <= MIN_PX_THRESHOLD) {
      return value;
    }
    // 其他值转换为 rem 字符串
    const remValue = value / REM_BASE;
    return `${remValue}rem`;
  }

  // 如果是字符串
  if (typeof value === "string") {
    // 匹配 "数字px" 格式
    const regex = /^(\d*\.?\d+)px$/;
    const match = value.match(regex);
    
    if (match) {
      const pxValue = parseFloat(match[1]);
      // 小于等于 MIN_PX_THRESHOLD 的保持为 px（返回数字，React 会自动添加 "px"）
      if (pxValue <= MIN_PX_THRESHOLD) {
        return pxValue;
      }
      // 其他值转换为 rem 字符串
      const remValue = pxValue / REM_BASE;
      return `${remValue}rem`;
    }
    
    // 如果不包含 px，可能是百分比或其他单位，保持原样
    return value;
  }

  return value;
}


const pxtransform = (value: string | number, type: "rpx" | "rem" = "rpx"): string | number =>{
  if (isPxValue(value)) {
    if (type === "rpx") {
      return pxToRpx(value);
    } else if (type === "rem") {
      return pxToRem(value);
    }
  }
  return value;
}

export default pxtransform;

