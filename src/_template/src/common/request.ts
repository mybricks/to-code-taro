/* eslint-disable @typescript-eslint/no-explicit-any */
import Taro from '@tarojs/taro';
// @ts-ignore
import { api, baseConfig } from './api';
// @ts-ignore
import pageModel from './pageModel';

export function request(connector: any, params: any, config: any = {}, appContext?: any) {
  const connectorId = connector.id;
  const def = api[connectorId];

  if (!def) {
    return Promise.reject(`未找到连接器定义: ${connectorId}`);
  }

  return new Promise((resolve, reject) => {
    try {
      const method = def.method;
      const path = def.path?.trim();
      let headers = def.headers || {};

      const url = path;
      const extraParams = {
        globalVars: appContext?.$vars?.current
      };

      // 设置全局请求头逻辑组件
      let mybricksGlobalHeaders = Taro.getStorageSync(
        "_MYBRICKS_GLOBAL_HEADERS_"
      );
      if (mybricksGlobalHeaders) {
        headers = {
          ...mybricksGlobalHeaders,
          ...headers,
        };
      }

      /** 1. 全局入参处理 */
      const globalParams = baseConfig.globalParamsFn(
        method.startsWith('GET')
          ? { params, url, method, headers }
          : { data: params, url, method, headers },
        extraParams
      );

      /** 2. 局部入参处理 (Connector Script) */
      const options = def.input(globalParams, extraParams);

      const requestConfig: Taro.request.Option = {
        url: options.url || url,
        method: (options.method || method) as any,
        header: options.headers || options.header || headers,
        data: options.data || options.params || params,
        timeout: options.timeout || config.timeout,
        dataType: options.dataType || config.dataType || 'json',
        responseType: options.responseType || config.responseType || 'text',
      };

      /**
       * 如果 url 不以 http 开头，添加默认域名
       */
      const defaultCallServiceHost = pageModel?.appConfig?.defaultCallServiceHost
      if (
        !/^(http|https):\/\/.*/.test(requestConfig.url) &&
        defaultCallServiceHost
      ) {
        requestConfig.url = `${defaultCallServiceHost}${requestConfig.url}`;
      }

      const onError = (error: any) => {
        const errorResult = baseConfig.globalErrorResultFn(
          { error, response: error?.response, config: options },
          { throwError: (msg: any) => reject(msg) }
        );
        if (errorResult !== undefined) {
          reject(errorResult);
        }
      };

      Taro.request({
        ...requestConfig,
        success: (res) => {
          /** 3. 全局响应值处理 */
          Promise.resolve()
            .then(() => {
              return baseConfig.globalResultFn(
                { response: res.data, config: options },
                { 
                  throwStatusCodeError: (msg: any) => reject(msg),
                  throwError: (msg: any) => reject(msg)
                }
              );
            })
            .then((globalResult) => {
              /** 4. 局部响应值处理 (Connector Script) */
              const result = def.output(
                globalResult,
                { ...options },
                { 
                  throwStatusCodeError: (msg: any) => reject(msg),
                  throwError: (msg: any) => reject(msg)
                }
              );

              // 处理 markList (多分支输出)
              const markList = def.markList || [];
              let outputId = 'then';

              if (markList.length > 0) {
                for (const mark of markList) {
                  const { id, predicate } = mark;
                  if (!predicate || !predicate.key || predicate.value === undefined) {
                    outputId = id === 'default' ? 'then' : id;
                    break;
                  }

                  let curResult = result;
                  const keys = predicate.key.split('.');
                  while (curResult && keys.length) {
                    curResult = curResult[keys.shift()];
                  }

                  if (!keys.length && (
                    predicate.operator === '=' 
                      ? curResult === predicate.value 
                      : curResult !== predicate.value
                  )) {
                    outputId = id === 'default' ? 'then' : id;
                    break;
                  }
                }
              }

              // 返回包含 OUTPUT_ID 的结果，供 _Connector.ts 使用
              resolve({
                __OUTPUT_ID__: outputId,
                __ORIGIN_RESPONSE__: result
              });
            })
            .catch(onError);
        },
        fail: (err) => {
          reject(err?.errMsg || "连接器执行失败");
        },
      });
    } catch (error: any) {
      console.error('连接器执行失败:', error);
      reject(error?.message || '连接器执行失败');
    }
  });
}
