export interface CoreRuntimeConfig {
  /** HTTP 请求函数 */
  request?: (connector: any, params: any, config?: any, appContext?: any) => Promise<any>;
  /** 项目根配置 */
  rootConfig?: {
    status?: {
      defaultCallServiceHost?: string;
    };
  };
  /** TabBar 配置 */
  tabBarConfig?: {
    tabBar?: {
      list?: Array<{ pagePath: string; [key: string]: any }>;
    };
  };
}

let _config: CoreRuntimeConfig = {};

export function configureCoreRuntime(config: CoreRuntimeConfig) {
  _config = { ..._config, ...config };
}

export function getCoreRuntime(): CoreRuntimeConfig {
  return _config;
}
