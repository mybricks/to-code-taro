import { useRef, createContext, useContext } from 'react'
import { deepProxy } from './hooks'

export interface ComContextStore {
  comRefs: any;
  appContext: any;  
}

export function useAppCreateContext(): ComContextStore {
  const comRefs = useRef<any>(deepProxy({}));

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
  }
}
