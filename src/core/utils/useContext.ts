import { useRef, useState, useMemo } from 'react'
import { proxyRefs } from './hooks'
import { TodoPool } from './pool'
// @ts-ignore
import { request } from '@/common/request'

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
    env: {
      runtime: true,
      request: (connector: any, params: any, config: any) => request(connector, params, config, { $vars }),
    },
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
