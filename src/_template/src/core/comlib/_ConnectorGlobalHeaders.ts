export type DataType = {
  headers?: Record<string, string>;
};

export interface Inputs {
  setGlobalHeaders?: (fn: (config: DataType, relOutputs?: any) => void) => void;
  getGlobalHeaders?: (fn: (config: {}, relOutputs?: any) => void) => void;
  clearGlobalHeaders?: (fn: (config: {}, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

// 全局请求头存储
let globalHeaders: Record<string, string> = {};

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.setGlobalHeaders?.((val: DataType) => {
    try {
      const headers = val?.headers || data.headers || {};

      if (Object.keys(headers).length === 0) {
        outputs.onFail('请求头不能为空');
        return;
      }

      // 合并到全局请求头
      globalHeaders = { ...globalHeaders, ...headers };

      outputs.onSuccess({
        globalHeaders: { ...globalHeaders },
        addedHeaders: headers,
      });
    } catch (error: any) {
      console.error('设置全局请求头失败:', error);
      outputs.onFail(error?.message || '设置全局请求头失败');
    }
  });

  inputs.getGlobalHeaders?.(() => {
    try {
      outputs.onSuccess({
        globalHeaders: { ...globalHeaders },
      });
    } catch (error: any) {
      console.error('获取全局请求头失败:', error);
      outputs.onFail(error?.message || '获取全局请求头失败');
    }
  });

  inputs.clearGlobalHeaders?.(() => {
    try {
      const oldHeaders = { ...globalHeaders };
      globalHeaders = {};

      outputs.onSuccess({
        clearedHeaders: oldHeaders,
        globalHeaders: {},
      });
    } catch (error: any) {
      console.error('清除全局请求头失败:', error);
      outputs.onFail(error?.message || '清除全局请求头失败');
    }
  });
};

// 导出一个工具函数，用于在其他组件中获取全局请求头
export const getGlobalHeaders = (): Record<string, string> => {
  return { ...globalHeaders };
};
