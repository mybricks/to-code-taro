export type DataType = {
  delay?: number; // 防抖延迟时间（毫秒）
  leading?: boolean; // 是否在开始时执行
  trailing?: boolean; // 是否在结束时执行
};

export interface Inputs {
  debounce?: (fn: (config: DataType, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onExecute: (value?: any) => void;
  onComplete: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

// 防抖函数实现
function debounce(func: Function, delay: number, options: { leading?: boolean; trailing?: boolean } = {}) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  const { leading = false, trailing = true } = options;

  return function (...args: any[]) {
    const currentTime = Date.now();

    if (!timeoutId && leading) {
      func.apply(null, args);
      lastExecTime = currentTime;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (trailing && (!leading || currentTime - lastExecTime >= delay)) {
        func.apply(null, args);
      }
      timeoutId = null;
    }, delay);
  };
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  let debouncedFn: Function | null = null;

  inputs.debounce?.((val: DataType) => {
    try {
      const delay = val?.delay || data.delay || 300;
      const leading = val?.leading !== undefined ? val.leading : data.leading || false;
      const trailing = val?.trailing !== undefined ? val.trailing : data.trailing || true;

      if (!debouncedFn) {
        debouncedFn = debounce(
          () => {
            outputs.onExecute({ delay, leading, trailing, timestamp: Date.now() });
          },
          delay,
          { leading, trailing }
        );
      }

      // 执行防抖函数
      debouncedFn();

      outputs.onComplete({ delay, leading, trailing });
    } catch (error: any) {
      console.error('防抖执行失败:', error);
    }
  });
};
