import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useCatalog from '../hooks/useCatalog'
import { useSeller } from '../context/useSeller'
import { vehicles as dataVehicles, findInterchanges, interchangesFor } from '../data'
import { useStore } from '../context/useStore'
import ProductCard from '../components/ProductCard'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import ProductArt from '../components/ProductArt'
import CountUp from '../components/CountUp'
import AddProduct from '../components/AddProduct'
import { IconCar, IconFilter, IconX, IconCheck, IconPlus } from '../components/icons'

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price · Low to High' },
  { id: 'price-desc', label: 'Price · High to Low' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'reviews', label: 'Most Reviewed' },
]

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const { products, categories, brands, vehicles, ready } = useCatalog()
  const { activeVehicle } = useStore()
  const { isSeller } = useSeller()
  const [showFilters, setShowFilters] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)

  const allVehicles = useMemo(() => {
    const map = new Map()
    for (const v of [...dataVehicles, ...vehicles]) map.set(v.id, v)
    return [...map.values()]
  }, [vehicles])

  const cat = params.get('cat') || ''
  const q = params.get('q') || ''
  const vehicleId = params.get('vehicle') || ''
  const fitmentOpen = params.get('fitment') === '1'
  const sort = params.get('sort') || 'featured'
  const brandsParam = params.get('brands') || ''
  const selectedBrands = useMemo(
    () => (brandsParam ? brandsParam.split(',') : []),
    [brandsParam],
  )
  const maxPrice = params.get('max') || ''
  const inStock = params.get('inStock') === '1'

  useEffect(() => {
    if (!params.get('vehicle') && !params.get('cat') && activeVehicle) {
      const next = new URLSearchParams(params)
      next.set('vehicle', activeVehicle)
      next.set('fitment', '1')
      setParams(next, { replace: true })
    }
  }, [])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === '' || value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
    if (window.innerWidth <= 980) setShowFilters(false)
  }

  const toggleBrand = (b) => {
    const list = selectedBrands.includes(b)
      ? selectedBrands.filter((x) => x !== b)
      : [...selectedBrands, b]
    setParam('brands', list.join(','))
    if (window.innerWidth <= 980) setShowFilters(false)
  }

  const clearAll = () => setParams(new URLSearchParams(), { replace: true })

  const vehicle = allVehicles.find((v) => v.id === vehicleId)

  const filtered = useMemo(() => {
    let list = [...products]

    if (cat) list = list.filter((p) => p.category === cat)
    if (q) {
      const needle = q.toLowerCase()
      const ixMatches = findInterchanges(q)
      const ixIds = new Set(ixMatches.map((i) => i.partNo.toLowerCase()))
      list = list.filter((p) => {
        const hay = `${p.name} ${p.partNo} ${p.brand}`.toLowerCase()
        if (hay.includes(needle) || p.name.toLowerCase().includes(needle) || p.partNo.toLowerCase().includes(needle) || p.brand.toLowerCase().includes(needle)) return true
        return interchangesFor(p.partNo).some(
          (x) => x.oem.toLowerCase().includes(needle) || (ixIds.size > 0 && ixIds.has(x.partNo.toLowerCase())),
        )
      })
    }
    if (vehicleId) {
      const fitVehicle = allVehicles.find((x) => x.id === vehicleId)
      list = list.filter(
        (p) => p.fits.includes(vehicleId) || (fitVehicle && p.fits.some((f) => allVehicles.find((x) => x.id === f)?.make === fitVehicle.make)),
      )
    }
    if (selectedBrands.length) list = list.filter((p) => selectedBrands.includes(p.brand))
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice))
    if (inStock) list = list.filter((p) => p.stock > 0)

    const price = (p) => p.price
    switch (sort) {
      case 'price-asc': list.sort((a, b) => price(a) - price(b)); break
      case 'price-desc': list.sort((a, b) => price(b) - price(a)); break
      case 'rating': list.sort((a, b) => b.rating - a.rating); break
      case 'reviews': list.sort((a, b) => b.reviews - a.reviews); break
      default: list.sort((a, b) => Number(b.popular) - Number(a.popular))
    }
    return list
  }, [cat, q, vehicleId, selectedBrands, maxPrice, inStock, sort, products, allVehicles])

  const activeCat = categories.find((c) => c.id === cat)

  const chips = [
    activeCat && { label: activeCat.name, clear: () => setParam('cat', '') },
    q && { label: `"${q}"`, clear: () => setParam('q', '') },
    vehicle && { label: `${vehicle.make} ${vehicle.model}`, clear: () => { setParam('vehicle', ''); setParam('fitment', '') } },
    ...selectedBrands.map((b) => ({ label: b, clear: () => toggleBrand(b) })),
    maxPrice && { label: `Under ₹${Number(maxPrice).toLocaleString('en-IN')}`, clear: () => setParam('max', '') },
    inStock && { label: 'In stock only', clear: () => setParam('inStock', '') },
  ].filter(Boolean)

  const hasFilters = cat || q || vehicleId || selectedBrands.length || maxPrice || inStock

  return (
    <div className="shop container">
      <div className="shop-head">
        <div>
          <h1 className="shop-title">{activeCat ? activeCat.name : q ? `Results for "${q}"` : 'All Parts'}</h1>
          <p className="shop-count">
            <CountUp value={filtered.length} /> {filtered.length === 1 ? 'part' : 'parts'}
            {vehicle && <> for <strong>{vehicle.make} {vehicle.model}</strong></>}
          </p>
        </div>
        <div className="shop-actions">
          <button className="btn btn-sm filter-toggle" onClick={() => setShowFilters((s) => !s)}>
            <IconFilter width="16" height="16" /> Filters
            {chips.length > 0 && <span className="chip-count">{chips.length}</span>}
          </button>
          <select className="select sort-select" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort products">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {fitmentOpen && (
        <div className="fitment-banner card">
          <IconCar width="20" height="20" />
          <div className="fitment-banner-copy">
            <strong>{vehicle ? 'Fitment applied' : 'Find parts for your car'}</strong>
            <span>{vehicle ? `Showing parts for ${vehicle.make} ${vehicle.model}` : 'Pick your car to see compatible parts.'}</span>
          </div>
          <select className="select fitment-select" value={vehicleId} onChange={(e) => { setParam('vehicle', e.target.value); setParam('fitment', '1') }} aria-label="Select vehicle">
            <option value="">Select vehicle…</option>
            {allVehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.make} {v.model} · {v.years}</option>
            ))}
          </select>
        </div>
      )}

      {chips.length > 0 && (
        <div className="chips-row">
          {chips.map((c, i) => (
            <button key={i} className="chip chip-clear" onClick={c.clear}>
              {c.label} <IconX width="12" height="12" />
            </button>
          ))}
          {hasFilters && <button className="link-btn" onClick={clearAll}>Clear all</button>}
        </div>
      )}

      <div className="shop-layout">
        {showFilters && <div className="filters-backdrop" onClick={() => setShowFilters(false)} />}
        <aside className={`filters ${showFilters ? 'filters-open' : ''}`}>
          <div className="filters-head">
            <strong>Filters</strong>
            <div className="filters-head-actions">
              {hasFilters && <button className="link-btn" onClick={clearAll}>Clear all</button>}
              <button className="filters-close-btn" onClick={() => setShowFilters(false)} aria-label="Close filters">
                <IconX width="18" height="18" />
              </button>
            </div>
          </div>

          <div className="fgroup">
            <span className="fgroup-title">Category</span>
            {categories.map((c) => (
              <label key={c.id} className="frow">
                <input type="radio" name="cat" checked={cat === c.id} onChange={() => setParam('cat', c.id === cat ? '' : c.id)} />
                <span>{c.short}</span>
                <em>{products.filter((p) => p.category === c.id).length}</em>
              </label>
            ))}
            <label className="frow">
              <input type="radio" name="cat" checked={!cat} onChange={() => setParam('cat', '')} />
              <span>All categories</span>
              <em>{products.length}</em>
            </label>
          </div>

          <div className="fgroup">
            <span className="fgroup-title">Vehicle</span>
            <select className="select" value={vehicleId} onChange={(e) => { setParam('vehicle', e.target.value); setParam('fitment', e.target.value ? '1' : '') }} aria-label="Filter by vehicle">
              <option value="">All vehicles</option>
              {allVehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.make} {v.model}</option>
              ))}
            </select>
          </div>

          <div className="fgroup">
            <span className="fgroup-title">Brand</span>
            <div className="brand-chips">
              {brands.map((b) => (
                <button key={b} className={`chip ${selectedBrands.includes(b) ? 'chip-active' : ''}`} onClick={() => toggleBrand(b)}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="fgroup">
            <span className="fgroup-title">Max Price</span>
            <select className="select" value={maxPrice} onChange={(e) => setParam('max', e.target.value)} aria-label="Max price">
              <option value="">Any</option>
              {[1000, 2000, 3000, 5000, 8000, 12000].map((n) => (
                <option key={n} value={n}>Up to ₹{n.toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>

          <label className="frow frow-check">
            <input type="checkbox" checked={inStock} onChange={(e) => setParam('inStock', e.target.checked ? '1' : '')} />
            <span>In stock only</span>
            <IconCheck width="14" height="14" />
          </label>
        </aside>

        <div className="shop-grid-wrap">
          {isSeller && (
            <button className="seller-add-btn" onClick={() => setShowAddProduct(true)}>
              <IconPlus width="18" height="18" /> Add Product
            </button>
          )}
          {filtered.length === 0 && ready ? (
            <div className="empty-state card">
              <ProductArt category="care" />
              <h3>No parts match those filters</h3>
              <p>Try clearing some filters or searching a different part number.</p>
              <button className="btn btn-primary" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid-products">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid-products">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddProduct && (
        <AddProduct category={cat} onClose={() => setShowAddProduct(false)} />
      )}
    </div>
  )
}
