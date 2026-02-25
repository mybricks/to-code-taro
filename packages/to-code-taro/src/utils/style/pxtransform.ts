/**
 * px 转 rpx (Taro 标准)
 */
function pxToRpx(value: string | number): string {
  if (typeof value === "number") {
    return `${value * 2}rpx`;
  }
  if (typeof value !== "string") return String(value);

  // 处理带有 px 的字符串，支持替换所有 px
  return value.replace(/(\d*\.?\d+)px/g, (_, num) => {
    return `${parseFloat(num) * 2}rpx`;
  });
}

/**
 * px 转 rem (H5 标准)
 */
function pxToRem(value: string | number): string {
  if (typeof value === "number") {
    return `${value / 16}rem`;
  }
  if (typeof value !== "string") return String(value);

  return value.replace(/(\d*\.?\d+)px/g, (_, num) => {
    return `${parseFloat(num) / 16}rem`;
  });
}

/**
 * 判断是否需要转换
 */
function isPxValue(value: string | number): boolean {
  if (typeof value === "number") {
    return true;
  }
  if (typeof value === "string") {
    return /\d*\.?\d+px/.test(value); // 包含 px 的字符串或数字需要转换
  }
  return false;
}

/**
 * 样式转换主函数
 */
export default function pxtransform(value: any, target: "rpx" | "rem" = "rpx"): any {
  if (!isPxValue(value)) {
    return value;
  }

  if (target === "rem") {
    return pxToRem(value);
  }

  return pxToRpx(value);
}
