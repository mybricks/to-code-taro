import Taro from '@tarojs/taro';

export type DataType = {
  path?: string;
  params?: Record<string, any>;
  type?: 'navigateTo' | 'redirectTo' | 'switchTab' | 'reLaunch' | 'navigateBack';
  delta?: number;
};

export interface Inputs {
  navigate?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.navigate?.((val: DataType) => {
    try {
      const type = val?.type || data.type || 'navigateTo';
      const path = val?.path || data.path;
      const params = val?.params || data.params || {};
      const delta = val?.delta || data.delta || 1;

      if (!path && type !== 'navigateBack') {
        outputs.onFail('路由路径不能为空');
        return;
      }

      // 构建完整的URL
      let url = path;
      if (params && Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        url += (url.includes('?') ? '&' : '?') + queryString;
      }

      switch (type) {
        case 'navigateTo':
          Taro.navigateTo({
            url,
            success: () => outputs.onSuccess({ type, path: url, params }),
            fail: (err) => outputs.onFail(err.errMsg || '页面跳转失败'),
          });
          break;

        case 'redirectTo':
          Taro.redirectTo({
            url,
            success: () => outputs.onSuccess({ type, path: url, params }),
            fail: (err) => outputs.onFail(err.errMsg || '页面重定向失败'),
          });
          break;

        case 'switchTab':
          Taro.switchTab({
            url,
            success: () => outputs.onSuccess({ type, path: url, params }),
            fail: (err) => outputs.onFail(err.errMsg || '切换Tab失败'),
          });
          break;

        case 'reLaunch':
          Taro.reLaunch({
            url,
            success: () => outputs.onSuccess({ type, path: url, params }),
            fail: (err) => outputs.onFail(err.errMsg || '重启应用失败'),
          });
          break;

        case 'navigateBack':
          Taro.navigateBack({
            delta,
            success: () => outputs.onSuccess({ type, delta }),
            fail: (err) => outputs.onFail(err.errMsg || '返回失败'),
          });
          break;

        default:
          outputs.onFail(`不支持的路由类型: ${type}`);
      }
    } catch (error: any) {
      console.error('路由跳转失败:', error);
      outputs.onFail(error?.message || '路由跳转失败');
    }
  });
};
