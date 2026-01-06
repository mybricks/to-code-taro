export type DataType = {
  input?: any;
  format?: 'json' | 'string' | 'number' | 'boolean' | 'date' | 'base64' | 'urlEncode' | 'urlDecode';
  options?: {
    dateFormat?: string; // 日期格式，如 'YYYY-MM-DD HH:mm:ss'
    precision?: number; // 数字精度
    radix?: number; // 进制转换的基数
  };
};

export interface Inputs {
  format?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.format?.((val: DataType) => {
    try {
      const input = val?.input !== undefined ? val.input : data.input;
      const format = val?.format || data.format || 'string';
      const options = val?.options || data.options || {};

      if (input === undefined || input === null) {
        outputs.onFail('输入值不能为空');
        return;
      }

      let result: any;

      switch (format) {
        case 'json':
          if (typeof input === 'string') {
            try {
              result = JSON.parse(input);
            } catch (error) {
              outputs.onFail('JSON解析失败');
              return;
            }
          } else {
            result = JSON.stringify(input, null, 2);
          }
          break;

        case 'string':
          result = String(input);
          break;

        case 'number':
          const num = Number(input);
          if (isNaN(num)) {
            outputs.onFail('无法转换为有效数字');
            return;
          }
          result = options.precision !== undefined ? Number(num.toFixed(options.precision)) : num;
          break;

        case 'boolean':
          result = Boolean(input);
          break;

        case 'date':
          const date = new Date(input);
          if (isNaN(date.getTime())) {
            outputs.onFail('无效的日期格式');
            return;
          }
          if (options.dateFormat) {
            // 简单的日期格式化
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            result = options.dateFormat
              .replace('YYYY', year.toString())
              .replace('MM', month)
              .replace('DD', day)
              .replace('HH', hours)
              .replace('mm', minutes)
              .replace('ss', seconds);
          } else {
            result = date.toISOString();
          }
          break;

        case 'base64':
          if (typeof input === 'string') {
            try {
              // 尝试解码Base64
              result = decodeURIComponent(escape(atob(input)));
            } catch {
              // 如果解码失败，则编码为Base64
              result = btoa(unescape(encodeURIComponent(input)));
            }
          } else {
            outputs.onFail('Base64转换需要字符串输入');
            return;
          }
          break;

        case 'urlEncode':
          result = encodeURIComponent(String(input));
          break;

        case 'urlDecode':
          try {
            result = decodeURIComponent(String(input));
          } catch (error) {
            outputs.onFail('URL解码失败');
            return;
          }
          break;

        default:
          outputs.onFail(`不支持的格式类型: ${format}`);
          return;
      }

      outputs.onSuccess({
        input,
        output: result,
        format,
        options,
      });
    } catch (error: any) {
      console.error('格式化失败:', error);
      outputs.onFail(error?.message || '格式化失败');
    }
  });
};
