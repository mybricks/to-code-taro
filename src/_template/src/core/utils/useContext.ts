import { useRef, useState } from 'react'
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

export function useAppCreateContext(): ComContextStore {
  // 约定：场景级 inputs 统一挂载到 $inputs，避免与组件 runtime 的 inputs 命名冲突
  // 同时可避免 `Cannot set property 'open' of undefined`
  const comRefs = useRef<any>(deepProxy({ $inputs: {} }));
  const [popupState, setPopupState] = useState({
    visible: false,
    name: '',
    value: null,
    controller: null
  });

  const appContext: any = {
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
  };
  return {
    comRefs,
    appContext,
    popupState,
    setPopupState
  }
}
