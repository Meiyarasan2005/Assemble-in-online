import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProduct } from '../data'
import { StoreContext } from './storeContext'
import { fetchMe, loginCustomer, logoutCustomer, registerCustomer } from '../lib/api'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

function readCart() {
  return readJSON('meispare-cart', [])
}

function readMode() {
  try {
    return localStorage.getItem('meispare-mode') === 'preowned' ? 'preowned' : 'retail'
  } catch {
    return 'retail'
  }
}

function readAuth() {
  try {
    const raw = localStorage.getItem('meispare-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.token !== 'string') return null
    return { token: parsed.token, customer: parsed.customer || null }
  } catch {
    return null
  }
}

function persistAuth(auth) {
  try {
    if (auth) localStorage.setItem('meispare-auth', JSON.stringify(auth))
    else localStorage.removeItem('meispare-auth')
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }) {
  const [mode, setMode] = useState(readMode)
  const [cart, setCart] = useState(readCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [auth, setAuth] = useState(readAuth)
  const [authReady, setAuthReady] = useState(false)
  const [garage, setGarage] = useState(() => readJSON('meispare-garage', []))
  const [activeVehicle, setActiveVehicle] = useState(() => {
    try {
      return localStorage.getItem('meispare-active-vehicle') || ''
    } catch {
      return ''
    }
  })
  const [wishlist, setWishlist] = useState(() => readJSON('meispare-wishlist', []))
  const [priceWatch, setPriceWatch] = useState(() => readJSON('meispare-pricewatch', {}))
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('meispare-lang') || 'en'
    } catch {
      return 'en'
    }
  })

  useEffect(() => {
    let cancelled = false
    const session = readAuth()
    if (!session) {
      setAuthReady(true)
      return
    }
    fetchMe(session.token)
      .then((data) => {
        if (cancelled) return
        setAuth({
          token: session.token,
          customer: data.customer || null,
        })
        setAuthReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setAuth(null)
        persistAuth(null)
        setAuthReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const notify = useCallback((message) => {
    setToast(message)
    clearTimeout(notify._t)
    notify._t = setTimeout(() => setToast(null), 2600)
  }, [])

  const addToCart = useCallback(
    (productId, qty = 1) => {
      const product = getProduct(productId)
      if (!product) return
      setCart((prev) => {
        const next = [...prev]
        const ix = next.findIndex((l) => l.productId === productId)
        if (ix >= 0) next[ix] = { ...next[ix], qty: next[ix].qty + qty }
        else next.push({ productId, qty, price: product.price })
        return next
      })
      notify(`${product.name} added to cart`)
    },
    [notify],
  )

  const setQty = useCallback((productId, qty) => {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty: Math.max(0, qty) } : l))
        .filter((l) => l.qty > 0),
    )
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const toggleMode = useCallback(() => setMode((m) => (m === 'preowned' ? 'retail' : 'preowned')), [])

  const addVehicle = useCallback((vehicleId) => {
    setGarage((prev) => (prev.includes(vehicleId) ? prev : [...prev, vehicleId]))
    setActiveVehicle(vehicleId)
  }, [])

  const removeVehicle = useCallback((vehicleId) => {
    setGarage((prev) => prev.filter((id) => id !== vehicleId))
    setActiveVehicle((current) => (current === vehicleId ? '' : current))
  }, [])

  const toggleWishlist = useCallback((productId) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }, [])

  const watchPrice = useCallback((productId, price) => {
    setPriceWatch((prev) => {
      if (prev[productId] === price) return prev
      return { ...prev, [productId]: price }
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-cart', JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-mode', mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-garage', JSON.stringify(garage))
    } catch {
      /* ignore */
    }
  }, [garage])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-active-vehicle', activeVehicle)
    } catch {
      /* ignore */
    }
  }, [activeVehicle])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-wishlist', JSON.stringify(wishlist))
    } catch {
      /* ignore */
    }
  }, [wishlist])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-pricewatch', JSON.stringify(priceWatch))
    } catch {
      /* ignore */
    }
  }, [priceWatch])

  useEffect(() => {
    try {
      localStorage.setItem('meispare-lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const lines = useMemo(
    () =>
      cart
        .map((l) => {
          const product = getProduct(l.productId)
          if (!product) return null
          return { ...l, product }
        })
        .filter(Boolean),
    [cart],
  )

  const subtotal = useMemo(
    () => lines.reduce((n, l) => n + l.product.price * l.qty, 0),
    [lines],
  )

  const savings = useMemo(
    () => lines.reduce((n, l) => n + (l.product.mrp - l.product.price) * l.qty, 0),
    [lines],
  )

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart])

  const isAuthed = Boolean(auth?.token)
  const token = auth?.token || null
  const customer = auth?.customer || null

  const showToast = notify

  const signIn = useCallback(async (payload) => {
    const data = await loginCustomer(payload)
    const session = { token: data.token, customer: data.customer || null }
    persistAuth(session)
    setAuth(session)
    return data
  }, [])

  const signUp = useCallback(async (payload) => {
    const data = await registerCustomer(payload)
    const session = { token: data.token, customer: data.customer || null }
    persistAuth(session)
    setAuth(session)
    return data
  }, [])

  const signOut = useCallback(async () => {
    const current = auth?.token
    setAuth(null)
    persistAuth(null)
    if (current) {
      try {
        await logoutCustomer(current)
      } catch {
        /* ignore */
      }
    }
  }, [auth])

  const refreshCustomer = useCallback(async () => {
    if (!auth?.token) return
    try {
      const data = await fetchMe(auth.token)
      setAuth((prev) => (prev ? { ...prev, customer: data.customer || null } : prev))
    } catch {
      /* ignore */
    }
  }, [auth])

  return (
    <StoreContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        cart,
        setCart,
        cartOpen,
        setCartOpen,
        toast,
        setToast,
        notify,
        lines,
        subtotal,
        savings,
        cartCount,
        addToCart,
        setQty,
        removeFromCart,
        clearCart,
        showToast,
        signIn,
        signUp,
        signOut,
        auth,
        token,
        customer,
        isAuthed,
        authReady,
        refreshCustomer,
        login: loginCustomer,
        logout: logoutCustomer,
        register: registerCustomer,
        garage,
        activeVehicle,
        setActiveVehicle,
        addVehicle,
        removeVehicle,
        wishlist,
        toggleWishlist,
        priceWatch,
        watchPrice,
        lang,
        setLang,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}
