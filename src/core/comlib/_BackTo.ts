import Taro from '@tarojs/taro';

export type DataType = {
  delta?: number;
  animation?: boolean;
};

export interface Inputs {
  back?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.back?.((val: DataType) => {
    try {
      const delta = val?.delta ?? data.delta ?? 1;
      const animation = val?.animation !== undefined ? val.animation : data.animation ?? true;

      // 获取当前页面栈信息
      const pages = Taro.getCurrentPages();
      const currentIndex = pages.length - 1;

      if (currentIndex === 0) {
        // 如果是首页，返回失败
        outputs.onFail('已经是首页，无法返回');
        return;
      }

      if (delta > currentIndex) {
        // 如果返回层数超过页面栈深度，返回失败
        outputs.onFail(`页面栈深度不足，无法返回${delta}层`);
        return;
      }

      if (delta === 1) {
        // 返回上一页
        Taro.navigateBack({
          delta: 1,
          animation,
          success: () => outputs.onSuccess({ delta: 1 }),
          fail: (err) => outputs.onFail(err.errMsg || '返回失败'),
        });
      } else {
        // 多层返回，需要先获取目标页面信息
        const targetPage = pages[currentIndex - delta];
        if (targetPage) {
          Taro.navigateBack({
            delta,
            animation,
            success: () => outputs.onSuccess({ delta, targetPage: targetPage.route }),
            fail: (err) => outputs.onFail(err.errMsg || '返回失败'),
          });
        } else {
          outputs.onFail('目标页面不存在');
        }
      }
    } catch (error: any) {
      console.error('返回操作失败:', error);
      outputs.onFail(error?.message || '返回操作失败');
    }
  });
};
