import { useContext, useEffect, useMemo, useState } from 'react'
import { fetchCatalog, fetchMeta } from '../lib/api'
import { useStore } from '../context/useStore'
import { SellerContext } from '../context/SellerContext'
import {
  products as staticProducts,
  preownedProducts as staticPreowned,
  categories as staticCategories,
  brands as staticBrands,
  vehicles as staticVehicles,
} from '../data'

function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    partNo: row.part_no ?? row.partNo ?? '',
    price: row.price,
    mrp: row.mrp,
    stock: row.stock,
    rating: row.rating,
    reviews: row.reviews,
    popular: row.popular,
    badge: row.badge ?? '',
    desc: row.desc ?? '',
    features: row.features ?? [],
    fits: row.fits ?? [],
    image: row.image ?? '',
  }
}

const CACHE_KEY = 'meispare-catalog-cache'
const CACHE_TTL = 5 * 60 * 1000

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { at, meta, products } = JSON.parse(raw)
    if (Date.now() - at > CACHE_TTL) return null
    return { meta, products }
  } catch {
    return null
  }
}

function writeCache(meta, products) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), meta, products }),
    )
  } catch {
    /* ignore */
  }
}

export default function useCatalog() {
  const { mode } = useStore()
  const sellerCtx = useContext(SellerContext)
  const catalogVersion = sellerCtx?.catalogVersion ?? 0

  const [state, setState] = useState(() => {
    const cached = readCache()
    if (cached) return { ready: true, online: true, ...cached }
    return {
      ready: false,
      online: false,
      meta: { categories: staticCategories, brands: staticBrands, vehicles: staticVehicles },
      products: staticProducts,
    }
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [meta, catalog] = await Promise.all([
          fetchMeta(),
          fetchCatalog({ limit: 500 }),
        ])
        if (cancelled) return
        const products = catalog.items.map(normalize)
        writeCache(meta, products)
        setState({ ready: true, online: true, meta, products })
      } catch {
        if (cancelled) return
        setState({
          ready: true,
          online: false,
          meta: { categories: staticCategories, brands: staticBrands, vehicles: staticVehicles },
          products: staticProducts,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [catalogVersion])

  return useMemo(
    () => ({
      ready: state.ready,
      online: state.online,
      products: mode === 'preowned' ? staticPreowned : state.products,
      categories: state.meta.categories,
      brands: state.meta.brands,
      vehicles: state.meta.vehicles,
    }),
    [state, mode],
  )
}
