import Taro from '@tarojs/taro';

export type DataType = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url?: string;
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  dataType?: 'json' | 'text' | 'base64';
  responseType?: 'text' | 'arraybuffer';
};

export interface Inputs {
  request?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.request?.((val: DataType) => {
    try {
      const config = {
        method: val?.method || data.method || 'GET',
        url: val?.url || data.url,
        header: val?.headers || data.headers || {},
        data: val?.data || data.data,
        timeout: val?.timeout || data.timeout,
        dataType: val?.dataType || data.dataType || 'json',
        responseType: val?.responseType || data.responseType || 'text',
      };

      if (!config.url) {
        outputs.onFail('请求URL不能为空');
        return;
      }

      // 检查URL格式
      if (!/^https?:\/\//.test(config.url)) {
        outputs.onFail('URL格式不正确，请以http://或https://开头');
        return;
      }

      Taro.request({
        ...config,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            outputs.onSuccess({
              data: res.data,
              statusCode: res.statusCode,
              header: res.header,
            });
          } else {
            outputs.onFail({
              message: `请求失败: ${res.statusCode}`,
              statusCode: res.statusCode,
              data: res.data,
            });
          }
        },
        fail: (err) => {
          outputs.onFail({
            message: err.errMsg || '网络请求失败',
            error: err,
          });
        },
      });
    } catch (error: any) {
      console.error('网络请求失败:', error);
      outputs.onFail({
        message: error?.message || '网络请求失败',
        error,
      });
    }
  });
};
