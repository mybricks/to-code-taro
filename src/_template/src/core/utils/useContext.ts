import { useRef, useState, useMemo } from 'react'
import { proxyRefs } from './hooks'

const GLOBAL_TODO_POOL = new Map<string, any[]>();

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
  globalTodoInputs: Map<string, any[]>;
}

export function useAppCreateContext(id: string): ComContextStore {
  const globalTodoInputs = useRef<Map<string, any[]>>(GLOBAL_TODO_POOL);
  const comRefs = useRef<any>(proxyRefs({ $inputs: {}, $outputs: {} }, undefined, globalTodoInputs.current));
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
    globalTodoInputs: globalTodoInputs.current,
    appContext,
    popupState,
    setPopupState
  }), [popupState]);
}
