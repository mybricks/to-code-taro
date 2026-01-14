import Taro from '@tarojs/taro';

export type DataType = {
  dynamic?: boolean;
  title?: string;
  content?: string;
  /** 微信/部分端支持，可编辑输入框 */
  editable?: boolean;
  showCancel?: boolean;
  cancelText?: string;
  cancelColor?: string;
  confirmText?: string;
  confirmColor?: string;
};

export interface Inputs {
  /** 显示模态对话框 */
  show?: (fn: (config?: DataType | string, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onConfirm: (value?: any) => void;
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

  inputs.show?.(async (val?: DataType | string) => {
    try {
      const cfg: DataType =
        typeof val === 'string'
          ? { content: val }
          : (val || {});

      const modalConfig: any = {
        title: cfg.title ?? data.title ?? '',
        content: cfg.content ?? data.content ?? '',
        showCancel: cfg.showCancel ?? data.showCancel ?? true,
        cancelText: cfg.cancelText ?? data.cancelText ?? '取消',
        cancelColor: cfg.cancelColor ?? data.cancelColor,
        confirmText: cfg.confirmText ?? data.confirmText ?? '确认',
        confirmColor: cfg.confirmColor ?? data.confirmColor,
      };

      // editable 不是所有端都支持，按存在即传
      if (cfg.editable !== undefined) modalConfig.editable = cfg.editable;
      else if (data.editable !== undefined) modalConfig.editable = data.editable;

      const res: any = await (Taro as any).showModal(modalConfig);
      if (res?.confirm) outputs.onConfirm?.(res);
      else outputs.onCancel?.(res);
    } catch (error: any) {
      console.error('显示 Modal 失败:', error);
      outputs.onCancel?.(error);
    }
  });
};


