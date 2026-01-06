export type DataType = {
  interval?: number; // 节流间隔时间（毫秒）
  leading?: boolean; // 是否在开始时执行
  trailing?: boolean; // 是否在结束时执行
};

export interface Inputs {
  throttle?: (fn: (config: DataType, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onExecute: (value?: any) => void;
  onSkip: (value?: any) => void;
  onComplete: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

// 节流函数实现
function throttle(func: Function, delay: number, options: { leading?: boolean; trailing?: boolean } = {}) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  const { leading = true, trailing = true } = options;

  return function (...args: any[]) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      if (leading) {
        func.apply(null, args);
        lastExecTime = currentTime;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        func.apply(null, args);
        lastExecTime = Date.now();
        timeoutId = null;
      }, delay - (currentTime - lastExecTime));
    }
  };
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  let throttledFn: Function | null = null;

  inputs.throttle?.((val: DataType) => {
    try {
      const interval = val?.interval || data.interval || 1000;
      const leading = val?.leading !== undefined ? val.leading : data.leading || true;
      const trailing = val?.trailing !== undefined ? val.trailing : data.trailing || true;

      if (!throttledFn) {
        throttledFn = throttle(
          () => {
            outputs.onExecute({ interval, leading, trailing, timestamp: Date.now() });
          },
          interval,
          { leading, trailing }
        );
      }

      // 执行节流函数
      throttledFn();

      outputs.onComplete({ interval, leading, trailing });
    } catch (error: any) {
      console.error('节流执行失败:', error);
    }
  });
};
