import { createContext, useCallback, useEffect, useState } from 'react'
import { sellerLogin as apiSellerLogin, sellerLogout as apiSellerLogout, sellerMe, sellerUpdateProduct, sellerUploadImage, sellerCreateProduct } from '../lib/api'

export const SellerContext = createContext(null)

function readSellerToken() {
  try {
    return localStorage.getItem('meispare-seller-token') || null
  } catch {
    return null
  }
}

function persistSeller(token, seller) {
  try {
    if (token) localStorage.setItem('meispare-seller-token', token)
    else localStorage.removeItem('meispare-seller-token')
    if (seller) localStorage.setItem('meispare-seller', JSON.stringify(seller))
    else localStorage.removeItem('meispare-seller')
  } catch { /* ignore */ }
}

export function SellerProvider({ children }) {
  const [token, setToken] = useState(readSellerToken)
  const [seller, setSeller] = useState(() => {
    try {
      const raw = localStorage.getItem('meispare-seller')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [sellerReady, setSellerReady] = useState(false)
  const [catalogVersion, setCatalogVersion] = useState(0)
  const isSeller = Boolean(token)

  useEffect(() => {
    const saved = readSellerToken()
    if (!saved) { setSellerReady(true); return }
    let cancelled = false
    sellerMe(saved)
      .then((data) => {
        if (cancelled) return
        setToken(saved)
        setSeller(data.seller)
        persistSeller(saved, data.seller)
        setSellerReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setToken(null)
        setSeller(null)
        persistSeller(null, null)
        setSellerReady(true)
      })
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiSellerLogin({ username, password })
    setToken(data.token)
    setSeller(data.seller)
    persistSeller(data.token, data.seller)
    return data
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      try { await apiSellerLogout(token) } catch { /* ignore */ }
    }
    setToken(null)
    setSeller(null)
    persistSeller(null, null)
  }, [token])

  const updateProduct = useCallback(async (productId, payload) => {
    if (!token) throw new Error('Not authenticated as seller')
    return sellerUpdateProduct(productId, payload, token)
  }, [token])

  const uploadImage = useCallback(async (productId, file) => {
    if (!token) throw new Error('Not authenticated as seller')
    return sellerUploadImage(productId, file, token)
  }, [token])

  const createProduct = useCallback(async (formData) => {
    if (!token) throw new Error('Not authenticated as seller')
    const result = await sellerCreateProduct(formData, token)
    setCatalogVersion((v) => v + 1)
    return result
  }, [token])

  const bumpCatalog = useCallback(() => setCatalogVersion((v) => v + 1), [])

  return (
    <SellerContext.Provider value={{ token, seller, isSeller, sellerReady, login, logout, updateProduct, uploadImage, createProduct, catalogVersion, bumpCatalog }}>
      {children}
    </SellerContext.Provider>
  )
}
