export type DataType = {
  delay?: number; // 延迟时间（毫秒）
};

export interface Inputs {
  delay?: (fn: (config: DataType, relOutputs?: any) => void) => void;
  cancel?: (fn: (config: {}, relOutputs?: any) => void) => void;
  /**
   * 兼容老协议：直接传入任意 payload，延迟后从 outputs.trigger 原样输出
   *（生成器里常见 inputs:["trigger"], outputs:["trigger"]）
   */
  trigger?: (fn: (payload: any, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onStart: (value?: any) => void;
  onExecute: (value?: any) => void;
  onCancel: (value?: any) => void;
  /** 兼容老协议 */
  trigger?: (value?: any) => void;
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

  let timeoutId: any = null;
  const inputPins = new Set(Object.keys(inputs as any));
  const outputPins = new Set(Object.keys(outputs as any));
  const hasIn = (pin: string) => inputPins.has(pin);
  const hasOut = (pin: string) => outputPins.has(pin);

  const clear = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  // 兼容：inputs.trigger(payload) -> 延迟后 outputs.trigger(payload)
  if (hasIn("trigger")) inputs.trigger?.((payload: any) => {
    try {
      // 允许 payload 自带 delay 覆盖；否则用 data.delay；再否则 1000
      const delay = payload?.delay || data.delay || 1000;

      clear();

      outputs.onStart?.({ delay, timestamp: Date.now() });

      timeoutId = setTimeout(() => {
        if (hasOut("trigger")) outputs.trigger?.(payload);
        outputs.onExecute?.({ delay, timestamp: Date.now() });
        timeoutId = null;
      }, delay);
    } catch (error: any) {
      console.error('延迟执行失败:', error);
      clear();
    }
  });

  if (hasIn("delay")) inputs.delay?.((val: DataType) => {
    try {
      const delay = val?.delay || data.delay || 1000;

      clear();

      outputs.onStart({ delay, timestamp: Date.now() });

      timeoutId = setTimeout(() => {
        outputs.onExecute({ delay, timestamp: Date.now() });
        timeoutId = null;
      }, delay);
    } catch (error: any) {
      console.error('延迟执行失败:', error);
      clear();
    }
  });

  if (hasIn("cancel")) inputs.cancel?.(() => {
    try {
      if (timeoutId) {
        clear();
        outputs.onCancel('延迟任务已取消');
      } else {
        outputs.onCancel('没有正在执行的延迟任务');
      }
    } catch (error: any) {
      console.error('取消延迟失败:', error);
    }
  });
};
