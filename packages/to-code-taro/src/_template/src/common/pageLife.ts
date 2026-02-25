import Taro, { useDidShow, useDidHide, useRouter } from '@tarojs/taro';

/**
 * 页面生命周期 Hook
 * 用于监听页面的 DidShow 和 DidHide 事件，并通过 Taro.eventCenter 触发全局事件
 */
export const usePageLife = () => {
  const router = useRouter();

  useDidShow(() => {
    Taro.eventCenter.trigger('pageDidShow', {
      path: router.path,
      query: router.params
    });
  });

  useDidHide(() => {
    Taro.eventCenter.trigger('pageDidHide', {
      path: router.path,
      query: router.params
    });
  });
};

