import { useRef, useState, useMemo } from 'react'
import { deepProxy } from './hooks'

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
}

export function useAppCreateContext(): ComContextStore {
  // 约定：场景级 inputs 统一挂载到 $inputs，避免与组件 runtime 的 inputs 命名冲突
  // 同时可避免 `Cannot set property 'open' of undefined`
  // 注册表拆分：
  // - comRefs: 组件实例/inputs/outputs 注册表（可 scoped）
  // - $vars/$fxs: 逻辑能力注册表（仅页面级，全作用域共享）
  const comRefs = useRef<any>(deepProxy({ $inputs: {}, $outputs: {} }));
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
      id: "u_7VvVn", // 使用 data 中的 id
    },
    runtime: {
      debug: false,
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
    appContext,
    popupState,
    setPopupState
  }), [popupState]);
}
