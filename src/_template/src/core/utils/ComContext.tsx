import { createContext, useContext } from 'react'
import type { ComContextStore } from './useContext'

const ComContext = createContext<ComContextStore | undefined>(undefined)

export function useAppContext(): ComContextStore {
  const context = useContext(ComContext)
  if (!context) {
    throw new Error('useAppContext must be used within a ComContext.Provider')
  }
  return context
}

export default ComContext
