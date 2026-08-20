import { useContext } from 'react'
import { SellerContext } from './SellerContext'

export function useSeller() {
  return useContext(SellerContext)
}
