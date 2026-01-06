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
  const comRefs = useRef<any>(deepProxy({}));
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
