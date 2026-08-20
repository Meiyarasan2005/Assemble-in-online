import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatINR } from '../data'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import CarArt from '../components/CarArt'
import ProductCard from '../components/ProductCard'
import {
  IconArrowRight,
  IconBolt,
  IconCar,
  IconCheck,
  IconGauge,
  IconPlus,
  IconSearch,
  IconTrash,
  IconWrench,
} from '../components/icons'

const KIT = [
  { key: 'brake-pads', label: 'Brake pads', match: (p) => p.category === 'braking' && /pad|brake/i.test(p.name) },
  { key: 'air-filter', label: 'Air filter', match: (p) => p.category === 'filters' && /air/i.test(p.name) && !/oil|cabin/i.test(p.name) },
  { key: 'oil-filter', label: 'Oil filter', match: (p) => p.category === 'filters' && /oil/i.test(p.name) },
  { key: 'spark-plugs', label: 'Spark plugs', match: (p) => p.category === 'engine' && /spark|plug/i.test(p.name) },
  { key: 'wipers', label: 'Wiper blades', match: (p) => /wiper/i.test(p.name) },
  { key: 'battery', label: 'Battery', match: (p) => p.category === 'electrical' && /battery/i.test(p.name) },
  { key: 'clutch-kit', label: 'Clutch kit', match: (p) => p.category === 'transmission' && /clutch/i.test(p.name) },
  { key: 'coolant', label: 'Coolant', match: (p) => p.category === 'cooling' && /coolant|antifreeze/i.test(p.name) },
]

export default function Garage() {
  const { garage, activeVehicle, setActiveVehicle, addVehicle, removeVehicle, addToCart } = useStore()
  const { products, vehicles, categories } = useCatalog()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickMake, setPickMake] = useState('')
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')

  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])
  const makes = useMemo(() => [...new Set(vehicles.map((v) => v.make))], [vehicles])
  const models = useMemo(() => vehicles.filter((v) => v.make === pickMake), [vehicles, pickMake])

  const saved = garage.map((id) => byId.get(id)).filter(Boolean)
  const activeId = garage.includes(activeVehicle) ? activeVehicle : saved[0]?.id || ''
  const car = byId.get(activeId)
  const unsaved = vehicles.filter((v) => !garage.includes(v.id))

  const carParts = useMemo(() => {
    if (!car) return []
    return products.filter((p) => (p.fits || []).includes(car.id))
  }, [products, car])

  const stats = useMemo(() => {
    const inStock = carParts.filter((p) => p.stock > 0)
    return {
      total: carParts.length,
      inStock: inStock.length,
      low: inStock.filter((p) => p.stock < 10).length,
      out: carParts.length - inStock.length,
    }
  }, [carParts])

  const kit = useMemo(() => {
    if (!car) return []
    return KIT.map((k) => ({ ...k, product: carParts.find((p) => k.match(p) && p.stock > 0) })).filter((k) => k.product)
  }, [carParts, car])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return carParts.filter((p) => {
      if (cat && p.category !== cat) return false
      if (!q) return true
      return `${p.name} ${p.partNo} ${p.brand}`.toLowerCase().includes(q)
    })
  }, [carParts, query, cat])

  const selectCar = (id) => {
    setActiveVehicle(id)
  }

  const addKit = () => {
    kit.forEach((k) => addToCart(k.product.id, 1, k.product))
  }

  const addKitItem = (k) => {
    addToCart(k.product.id, 1, k.product)
  }

  return (
    <div className="container garage-page">
      <div className="sec-head garage-head-top">
        <div>
          <div className="sec-kicker">Your fleet</div>
          <h1>My garage</h1>
          <p className="garage-sub">
            Save every car you own, then pull up the exact parts that fit it.
          </p>
        </div>
        {saved.length > 0 && (
          <button className="btn btn-primary" onClick={() => setPickerOpen((o) => !o)}>
            <IconPlus width="16" height="16" /> Add another car
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="garage-picker card">
          <div className="garage-picker-head">
            <strong>Add a car to your garage</strong>
            <button className="icon-btn" onClick={() => setPickerOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="garage-picker-grid">
            <select
              className="select"
              value={pickMake}
              onChange={(e) => {
                setPickMake(e.target.value)
              }}
              aria-label="Select make"
            >
              <option value="">Make</option>
              {makes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addVehicle(e.target.value)
                  selectCar(e.target.value)
                  setPickMake('')
                  setPickerOpen(false)
                }
              }}
              disabled={!pickMake}
              aria-label="Select model"
            >
              <option value="">Model</option>
              {models
                .filter((m) => !garage.includes(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.model} · {m.engine}
                  </option>
                ))}
            </select>
          </div>
          <p className="garage-picker-hint">
            Only cars already in your garage are hidden from the list.
          </p>
        </div>
      )}

      {saved.length === 0 ? (
        <div className="garage-empty-state card">
          <div className="garage-empty-art">
            <CarArt large />
          </div>
          <h3>Your garage is empty</h3>
          <p>
            Pick your car and we'll remember it — then show you only the parts that fit it.
          </p>
          {unsaved.length > 0 ? (
            <div className="garage-empty-add">
              <select
                className="select"
                value={pickMake}
                onChange={(e) => setPickMake(e.target.value)}
                aria-label="Select make"
              >
                <option value="">Make</option>
                {makes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addVehicle(e.target.value)
                    selectCar(e.target.value)
                  }
                }}
                disabled={!pickMake}
                aria-label="Select model"
              >
                <option value="">Model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.model} · {m.engine}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="garage-picker-hint">All vehicles have been added.</p>
          )}
        </div>
      ) : (
        <>
          <div className="garage-cars">
            {saved.map((v) => {
              const isActive = v.id === activeVehicle
              const parts = products.filter((p) => (p.fits || []).includes(v.id))
              const inStock = parts.filter((p) => p.stock > 0).length
              return (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  className={`garage-car card ${isActive ? 'is-active' : ''}`}
                  onClick={() => selectCar(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectCar(v.id)
                    }
                  }}
                >
                  <CarArt make={v.make} />
                  {isActive && (
                    <span className="garage-car-active">
                      <IconCheck width="13" height="13" /> Active
                    </span>
                  )}
                  <span className="garage-car-body">
                    <span className="garage-car-make">{v.make}</span>
                    <span className="garage-car-model">{v.model}</span>
                    <span className="garage-car-sub">
                      {v.engine} · {v.years}
                    </span>
                    <span className="garage-car-stats">
                      <span>{parts.length} parts</span>
                      <span className={inStock === 0 ? 'is-out' : ''}>
                        {inStock === 0 ? 'out of stock' : `${inStock} in stock`}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="garage-car-remove"
                    aria-label={`Remove ${v.model}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeVehicle(v.id)
                    }}
                  >
                    <IconTrash width="15" height="15" />
                  </button>
                </div>
              )
            })}
          </div>

          {car ? (
            <div className="garage-car-detail">
              <div className="garage-hero card">
                <div className="garage-hero-art">
                  <CarArt make={car.make} large />
                </div>
                <div className="garage-hero-info">
                  <span className="sec-kicker">{car.make}</span>
                  <h2>{car.model}</h2>
                  <p>
                    {car.engine} · {car.years}
                  </p>
                  <div className="garage-hero-stats">
                    <span>
                      <b>{stats.total}</b> matching parts
                    </span>
                    <span>
                      <b>{stats.inStock}</b> in stock
                    </span>
                    <span className={stats.low > 0 ? 'is-low' : ''}>
                      <b>{stats.low}</b> low stock
                    </span>
                    <span className={stats.out > 0 ? 'is-out' : ''}>
                      <b>{stats.out}</b> out
                    </span>
                  </div>
                  <Link
                    to={`/shop?fitment=1&vehicle=${car.id}`}
                    className="btn btn-ghost"
                  >
                    Shop all for {car.model} <IconArrowRight width="15" height="15" />
                  </Link>
                </div>
              </div>

              {kit.length > 0 && (
                <div className="garage-kit card">
                  <div className="garage-kit-head">
                    <span className="garage-kit-title">
                      <IconWrench width="16" height="16" /> Quick service kit
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={addKit}>
                      <IconBolt width="15" height="15" /> Add all in stock
                    </button>
                  </div>
                  <div className="garage-kit-items">
                    {kit.map((k) => (
                      <div key={k.key} className="garage-kit-item">
                        <span className="garage-kit-label">{k.label}</span>
                        <span className="garage-kit-product">{k.product.name}</span>
                        <span className="garage-kit-price">{formatINR(k.product.price)}</span>
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => addKitItem(k)}
                        >
                          <IconPlus width="13" height="13" /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="garage-parts">
                <div className="garage-parts-head">
                  <div>
                    <span className="sec-kicker">Parts for {car.model}</span>
                    <h3>Everything that fits</h3>
                  </div>
                  <div className="garage-parts-tools">
                    <label className="search garage-search">
                      <IconSearch width="16" height="16" />
                      <input
                        className="search-input"
                        type="search"
                        placeholder="Search these parts…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {shown.length === 0 ? (
                  <div className="garage-parts-empty card">
                    <IconCar width="30" height="30" />
                    <p>
                      No {cat ? 'parts in this category' : 'parts'} listed for the {car.model} yet.
                      Check the full shop or the fitment finder.
                    </p>
                    <Link to="/shop" className="btn btn-primary">
                      Browse all parts <IconArrowRight width="15" height="15" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid-featured">
                    {shown.map((p) => (
                      <ProductCard key={p.id} product={p} compact />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="garage-parts-empty card">
              <IconGauge width="30" height="30" />
              <p>Select one of your cars to see its parts.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
