/** 将第一个字符转大写 */
export const firstCharToUpperCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/** 将第一个字符转小写 */
export const firstCharToLowerCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

/** 驼峰转中划线 */
export const camelToKebab = (str: string) => {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
};

/** 中划线转驼峰 */
export const kebabToCamel = (str: string) => {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
};

