import { useRef, useState, useMemo } from 'react'
// @ts-ignore
import * as Taro from '@tarojs/taro'
// @ts-ignore
import { request } from '@/common/request'
import { tabbarIns } from "@/core/utils/tabbar"
// @ts-ignore
import rootConfig from '@/common/rootConfig';
import { proxyRefs } from './hooks'
import { TodoPool } from './pool'

export interface ComContextStore {
  comRefs: any;
  $vars: any;
  $fxs: any;
  appContext: any;  
  popupState: {
    visible: boolean;
    name: string;
    value: any;
    controller: any;
  };
  setPopupState: (state: any) => void;
  todoPool: TodoPool;
}

export function useAppCreateContext(id: string): ComContextStore {
  const todoPool = useMemo(() => new TodoPool(), []);
  const comRefs = useRef<any>(proxyRefs({ $inputs: {}, $outputs: {} }, undefined, todoPool));
  const $vars = useRef<any>({});
  const $fxs = useRef<any>({});

  const [popupState, setPopupState] = useState({
    visible: false,
    name: '',
    value: null,
    controller: null
  });

  const appContext = useRef({
    canvas: {
      id,
    },
    runtime: {
      debug: false,
    },
    env: {
      runtime: true,
      request: (connector: any, params: any, config: any) => request(connector, params, config, { $vars }),
      tabbar: tabbarIns,
      uploadFile: (params: any) => {
        let header = {};
        let mybricksGlobalHeaders = Taro.getStorageSync(
          "_MYBRICKS_GLOBAL_HEADERS_"
        );
        if (mybricksGlobalHeaders) {
          header = {
            ...mybricksGlobalHeaders,
            ...header,
          };
        }

        /**
         * 如果 url 不以 http 开头，添加默认域名
         */
        if (
          !/^(http|https):\/\/.*/.test(params.url) &&
          rootConfig?.status?.defaultCallServiceHost
        ) {
          params.url = `${rootConfig?.status?.defaultCallServiceHost}${params.url}`;
        }
        
        const { success, fail, ...rest } = params
        Taro.uploadFile({
          ...rest,
          success: (res: any) => success?.(res),
          fail: (err: any) => fail?.(err),
        })
      },
    },
    rootScroll: {},
    edit: false,
    isH5: false,
    isDesigner: false,
    isPreview: false,
    isRelease: false,
    isDebug: false,
    isLocal: false,
    isTest: false,
    tabBar: [],
    useTabBar: false,
  }).current;

  return useMemo(() => ({
    comRefs,
    $vars,
    $fxs,
    todoPool,
    appContext,
    popupState,
    setPopupState
  }), [popupState]);
}
