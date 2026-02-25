/**
 * 将 namespace 转换为组件名
 * 例如：mybricks.taro._showToast -> mybricks_taro_showToast
 * 例如：mybricks.taro._scan-qrcode -> mybricks_taro_scanQrcode
 */
export function convertNamespaceToComponentName(namespace: string): string {
  return namespace
    .split('.')
    .map((part, index) => {
      // 第一部分（mybricks）保持小写
      if (index === 0) {
        return part.toLowerCase();
      }
      // 其他部分：去掉下划线前缀，将连字符后的字母转为大写（驼峰命名）
      let result = part.replace(/^_/, '');
      result = result.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      return result;
    })
    .join('_');
}

/**
 * 将 namespace 转换为组件导入名（用于 JS 类型组件）
 * 例如：mybricks.taro._showToast -> mybricks_taro_showToast
 */
export function convertNamespaceToImportName(namespace: string): string {
  return convertNamespaceToComponentName(namespace);
}

