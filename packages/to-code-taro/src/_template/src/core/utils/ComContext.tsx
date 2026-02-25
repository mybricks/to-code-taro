import { createContext, useContext } from 'react'
import type { ComContextStore } from './useContext'
export { pageRouter } from './pageRouter'

const ComContext = createContext<ComContextStore | undefined>(undefined)
const SlotContext = createContext<any>(null)

export function useAppContext(): ComContextStore {
  const context = useContext(ComContext)
  if (!context) {
    throw new Error('useAppContext must be used within a ComContext.Provider')
  }
  return context
}

export function useParentSlot<T = any>(): T | null {
  return useContext(SlotContext)
}

export const SlotProvider = SlotContext.Provider

export default ComContext
