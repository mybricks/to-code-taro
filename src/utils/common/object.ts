import { indentation } from "./helper";

/** 生成对象代码 */
export const genObjectCode = (
  object: any,
  config: { initialIndent: number; indentSize: number },
): string => {
  const { initialIndent, indentSize } = config;
  const keys = Object.keys(object);
  if (keys.length === 0) return "{}";

  let result = "{\n";
  keys.forEach((key, idx) => {
    const value = object[key];
    let formattedValue: string;

    if (Array.isArray(value)) {
      formattedValue = JSON.stringify(value);
    } else if (value && typeof value === "object") {
      formattedValue = genObjectCode(value, {
        initialIndent: initialIndent + indentSize,
        indentSize,
      });
    } else if (typeof value === "string") {
      formattedValue = JSON.stringify(value);
    } else {
      formattedValue = String(value);
    }

    result +=
      indentation(initialIndent + indentSize) +
      `${JSON.stringify(key)}: ${formattedValue}`;
    if (idx < keys.length - 1) result += ",";
    result += "\n";
  });
  result += indentation(initialIndent) + "}";
  return result;
};

