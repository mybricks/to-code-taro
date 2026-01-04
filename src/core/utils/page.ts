import Taro from '@tarojs/taro';
import { Page } from '../mybricks';

/**
 * Taro 路由实现
 */
class TaroRouter {
  getParams(name: string) {
    const instance = Taro.getCurrentInstance();
    return {
      value: instance.router?.params
    };
  }

  push(name: string, { value }: any) {
    const url = `/pages/${name}/index`;
    const queryString = value ? `?data=${encodeURIComponent(JSON.stringify(value))}` : '';
    
    Taro.navigateTo({
      url: url + queryString
    });
  }

  replace(name: string, { value }: any) {
    const url = `/pages/${name}/index`;
    const queryString = value ? `?data=${encodeURIComponent(JSON.stringify(value))}` : '';
    
    Taro.redirectTo({
      url: url + queryString
    });
  }

  pop() {
    Taro.navigateBack();
  }
}

export const page = new Page(new TaroRouter());

