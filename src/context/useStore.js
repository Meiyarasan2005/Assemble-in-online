import { useContext } from 'react'
import { StoreContext } from './storeContext'

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
