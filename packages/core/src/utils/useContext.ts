import { useRef, useState, useMemo } from 'react'
// @ts-ignore
import * as Taro from '@tarojs/taro'
import { tabbarIns } from "./tabbar"
import { getCoreRuntime } from '../runtime'
import { proxyRefs } from './hooks'
import { TodoPool } from './pool'

export interface ComContextStore {
  comRefs: any;
  $vars: any;
  $fxs: any;
  appContext: any;
  moduleOutputs: Record<string, Function>;
  popupState: {
    visible: boolean;
    name: string;
    value: any;
    controller: any;
  };
  setPopupState: (state: any) => void;
  todoPool: TodoPool;
}

export function useAppCreateContext(id: string, parentComRefs?: any, moduleId?: string, moduleOutputs?: Record<string, Function>): ComContextStore {
  const { request, rootConfig } = getCoreRuntime();
  const todoPool = useMemo(() => new TodoPool(), []);

  const comRefs = useRef<any>(proxyRefs({ $inputs: {}, $outputs: {} }, undefined, todoPool));

  // 模块场景：把 $inputs 注册到页面 comRefs 上，使页面调用能找到 handler
  useMemo(() => {
    if (parentComRefs?.current && moduleId) {
      parentComRefs.current[moduleId] = comRefs.current.$inputs;
    }
  }, []);
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
      request: request
        ? (connector: any, params: any, config: any) => request(connector, params, config, { $vars })
        : () => Promise.reject('request 未配置'),
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

  const moduleOutputsRef = useRef<Record<string, Function>>(moduleOutputs || {});

  return useMemo(() => ({
    comRefs,
    $vars,
    $fxs,
    todoPool,
    appContext,
    moduleOutputs: moduleOutputsRef.current,
    popupState,
    setPopupState
  }), [popupState]);
}
