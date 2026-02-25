/**
 * 从组件的 namespace 转换为 className
 * 例如：mybricks.taro.systemPage -> mybricks_taro_systemPage
 * 例如：mybricks.taro.image -> mybricks_taro_image
 * @param namespace 组件的 namespace
 * @returns className（用下划线替换点）
 */
export function getComponentClassName(namespace: string): string {
  if (!namespace) {
    return '';
  }
  // 将点替换为下划线
  return namespace.replace(/\./g, '_');
}

/**
 * 从场景中获取根组件的 className
 * 获取场景中第一个组件的命名空间并转换为 className（仅用于根组件）
 * @param scene 场景对象
 * @param isRoot 是否为根组件
 * @returns className 字符串，如果不是根组件或未找到则返回空字符串
 */
export function getRootComponentClassName(scene: any, isRoot: boolean = false): string {
  // 只在根组件时获取 className
  if (!isRoot || !scene || !scene.coms) {
    return '';
  }
  
  // 获取场景中第一个组件的 namespace
  const firstCom = Object.values(scene.coms)[0] as any;
  
  if (firstCom?.def?.namespace) {
    return getComponentClassName(firstCom.def.namespace);
  }
  
  return '';
}

