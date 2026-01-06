// @ts-ignore 运行时由宿主项目提供 @tarojs/taro
import Taro from '@tarojs/taro';
import { Page } from '../mybricks';

/**
 * Taro 路由驱动 (纯粹版)
 * 只负责处理真正的 Taro 页面跳转
 */
class TaroRouter {
  private paramsBackup: Record<string, any> = {};

  getParams(name: string) {
    const instance = Taro.getCurrentInstance();
    let params = instance.router?.params || {};
    
    // 备份参数，解决某些生命周期下 Taro 获取不到 params 的问题
    if (!params.data && this.paramsBackup[name]) {
      params = { data: this.paramsBackup[name] };
    }

    return { value: params };
  }

  push(name: string, { value }: any) {
    const url = `/pages/${name}/index`;
    const dataStr = value ? encodeURIComponent(JSON.stringify(value)) : '';
    
    if (dataStr) {
      this.paramsBackup[name] = dataStr;
    }

    Taro.navigateTo({
      url: `${url}${dataStr ? `?data=${dataStr}` : ''}`
    });
  }

  replace(name: string, { value }: any) {
    const url = `/pages/${name}/index`;
    const dataStr = value ? encodeURIComponent(JSON.stringify(value)) : '';
    
    if (dataStr) {
      this.paramsBackup[name] = dataStr;
    }

    Taro.redirectTo({
      url: `${url}${dataStr ? `?data=${dataStr}` : ''}`
    });
  }

  pop() {
    Taro.navigateBack();
  }
}

export const router = new TaroRouter();
export const pageRouter = new Page(router);
