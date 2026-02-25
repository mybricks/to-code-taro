/**
 * 构建上下文数据
 * 包括 sceneMap, eventsMap 等查询映射
 */

/**
 * 构建场景映射表
 */
export const buildSceneMap = (scenes: any[]) => {
  return scenes.reduce((pre, cur) => {
    pre[cur.id] = cur;
    return pre;
  }, {} as Record<string, any>);
};

/**
 * 构建扩展事件映射表
 */
export const buildEventsMap = (frames: any[]) => {
  return frames.reduce((pre, cur) => {
    if (cur.type === "extension-event") {
      pre[cur.id] = cur;
    }
    return pre;
  }, {} as Record<string, any>);
};

/**
 * 构建连接器映射表
 */
export const buildConnectorMap = (plugins: any) => {
  const servicePlugin = plugins?.["@mybricks/plugins/service"];
  if (!servicePlugin) return null;

  return {
    connectors: servicePlugin.connectors || [],
    config: servicePlugin.config || {}
  };
};

/**
 * 创建场景查询函数
 */
export const createGetSceneById = (sceneMap: Record<string, any>) => {
  return (id: string) => {
    return sceneMap[id];
  };
};

/**
 * 创建扩展事件查询函数
 */
export const createGetExtensionEventById = (eventsMap: Record<string, any>) => {
  return (id: string) => {
    return eventsMap[id];
  };
};

/**
 * 创建 frame 查询函数
 */
export const createGetFrameById = (frameMap: Record<string, any>) => {
  return (id: string) => {
    return frameMap[id];
  };
};

