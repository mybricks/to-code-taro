/** 缩进 */
export const indentation = (level: number) => {
  return " ".repeat(level);
};

/**
 * 根据 schema.type 推导变量默认 initValue
 * - string: ''（未提供 initValue）
 * - number: 0
 * - boolean: false
 * - array: []
 * - object: {}
 * - 其他/未知: 优先使用 initValue，否则 {}
 */
export const getInitValueBySchema = (schema: any, initValue: any) => {
  // 允许显式传入 undefined 以外的任意值（包括 null / 0 / '' / false）
  if (initValue !== undefined) return initValue;

  const type = schema?.type;
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return {};
  }
};

