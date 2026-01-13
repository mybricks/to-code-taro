import { useRef, useState, useMemo } from 'react'
import { deepProxy } from './hooks'

export interface ComContextStore {
  comRefs: any;
  appContext: any;  
  popupState: {
    visible: boolean;
    name: string;
    value: any;
    controller: any;
  };
  setPopupState: (state: any) => void;
}

export function useAppCreateContext(id: string): ComContextStore {
  // 约定：场景级 inputs 统一挂载到 $inputs，避免与组件 runtime 的 inputs 命名冲突
  // 同时可避免 `Cannot set property 'open' of undefined`
  // 统一注册表（均挂载到 comRefs.current 上）
  // - $inputs: 场景级 inputs（open 等）
  // - $vars/$fxs: 逻辑能力注册表（变量/Fx）
  // - $outputs: 组件 outputs 注册表（按组件 id）
  const comRefs = useRef<any>(deepProxy({ $inputs: {}, $vars: {}, $fxs: {}, $outputs: {} }));
  const [popupState, setPopupState] = useState({
    visible: false,
    name: '',
    value: null,
    controller: null
  });

  const appContext = useRef({
    canvas: {
      id, // 使用 data 中的 id
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
    appContext,
    popupState,
    setPopupState
  }), [popupState]);
}
