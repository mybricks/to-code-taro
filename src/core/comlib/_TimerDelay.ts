export type DataType = {
  delay?: number; // 延迟时间（毫秒）
};

export interface Inputs {
  delay?: (fn: (config: DataType, relOutputs?: any) => void) => void;
  cancel?: (fn: (config: {}, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onStart: (value?: any) => void;
  onExecute: (value?: any) => void;
  onCancel: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  let timeoutId: NodeJS.Timeout | null = null;

  inputs.delay?.((val: DataType) => {
    try {
      const delay = val?.delay || data.delay || 1000;

      // 清除之前的定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      outputs.onStart({ delay, timestamp: Date.now() });

      timeoutId = setTimeout(() => {
        outputs.onExecute({ delay, timestamp: Date.now() });
        timeoutId = null;
      }, delay);
    } catch (error: any) {
      console.error('延迟执行失败:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  });

  inputs.cancel?.(() => {
    try {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        outputs.onCancel('延迟任务已取消');
      } else {
        outputs.onCancel('没有正在执行的延迟任务');
      }
    } catch (error: any) {
      console.error('取消延迟失败:', error);
    }
  });
};
