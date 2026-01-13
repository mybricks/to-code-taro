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

/** 检查字符串是否包含中文 */
export const hasChinese = (str: string): boolean => {
  return /[\u4e00-\u9fa5]/.test(str);
};

/** 
 * 获取安全的变量名
 * 优先使用 title，如果 title 包含中文则使用 id
 */
export const getSafeVarName = (com: { title?: string; id: string }): string => {
  if (com.title && !hasChinese(com.title)) {
    return com.title;
  }
  return com.id;
};

