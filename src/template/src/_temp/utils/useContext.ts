import { useRef, useState } from 'react'

export interface ComContextStore {
  comRefs: any;
}

export function useAppCreateContext(): ComContextStore {
  const comRefs = useRef<any>({});
  
  return {
    comRefs,
  }
}
