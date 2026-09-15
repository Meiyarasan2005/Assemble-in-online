import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCatalog } from '../lib/api'
import { getCategory } from '../data'
import { useSeller } from '../context/useSeller'
import AddProduct from '../components/AddProduct'
import { IconPlus, IconRefreshCw, IconSearch } from '../components/icons'

function thumb(p) {
  if (p.image) return p.image
  if (p.category) return `/images/${p.category}.jpg`
  return ''
}

function statusOf(p) {
  if (p.stock <= 0) return 'out'
  if (p.stock <= 5) return 'low'
  return 'ok'
}

function AdminLogin() {
  const { login } = useSeller()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="container">
        <div className="admin-login-card">
          <h1 className="admin-login-title">Seller Admin</h1>
          <p className="admin-login-sub">Sign in to manage inventory, prices and stock.</p>
          <form className="seller-form" onSubmit={submit}>
            {error && <div className="seller-error">{error}</div>}
            <label className="seller-label">
              Username
              <input
                className="seller-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label className="seller-label">
              Password
              <input
                className="seller-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="btn btn-primary seller-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function InlineField({ value, onSave, type = 'number', className, prefix }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => {
    setEditing(false)
    const parsed = type === 'number' ? Number(draft) : draft
    if (parsed !== value) onSave(parsed)
  }

  if (!editing) {
    return (
      <span
        className={`admin-edit ${className || ''}`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="Click to edit"
      >
        {prefix && <span className="admin-edit-prefix">{prefix}</span>}
        {type === 'number' ? Number(value).toLocaleString('en-IN') : value}
        <span className="seller-pencil">&#9998;</span>
      </span>
    )
  }

  return (
    <span className="admin-editor" onClick={(e) => e.preventDefault()}>
      {prefix && <span className="admin-edit-prefix">{prefix}</span>}
      <input
        className="seller-inline-input admin-edit-input"
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
        min={type === 'number' ? 0 : undefined}
        autoFocus
      />
    </span>
  )
}

function Dashboard() {
  const { seller, logout, updateProduct, bumpCatalog, catalogVersion } = useSeller()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCatalog({ sort: 'name', limit: 500 })
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, catalogVersion])

  const saveField = useCallback(
    async (productId, field, val) => {
      setError('')
      try {
        await updateProduct(productId, { [field]: val })
        setItems((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: val } : p)))
        bumpCatalog()
      } catch (err) {
        setError(err.message || 'Save failed')
      }
    },
    [updateProduct, bumpCatalog],
  )

  const filtered = useMemo(() => {
    if (!items) return []
    const needle = q.trim().toLowerCase()
    return items.filter((p) => {
      if (stockFilter !== 'all' && statusOf(p) !== stockFilter) return false
      if (!needle) return true
      return [p.name, p.brand, p.part_no, p.id].some((f) =>
        String(f ?? '').toLowerCase().includes(needle),
      )
    })
  }, [items, q, stockFilter])

  const counts = useMemo(() => {
    const c = { all: items?.length ?? 0, ok: 0, low: 0, out: 0 }
    items?.forEach((p) => {
      c[statusOf(p)] += 1
    })
    return c
  }, [items])

  if (loading && !items) {
    return (
      <div className="admin-page">
        <div className="container admin-loading">Loading inventory&#8230;</div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="container">
        <div className="admin-toolbar">
          <div className="admin-toolbar-title">
            <h1>Inventory</h1>
            <span className="admin-toolbar-sub">
              {seller?.username} · {counts.all} products
            </span>
          </div>
          <div className="admin-toolbar-actions">
            <button className="btn btn-outline admin-btn" onClick={load} title="Refresh">
              <IconRefreshCw width="14" height="14" /> Refresh
            </button>
            <button className="seller-add-btn admin-add-btn" onClick={() => setShowAdd(true)}>
              <IconPlus width="14" height="14" /> Add product
            </button>
            <button className="btn btn-outline admin-btn admin-btn-danger" onClick={logout}>
              Log out
            </button>
          </div>
        </div>

        {error && <div className="seller-error admin-error">{error}</div>}

        <div className="admin-filters">
          <div className="admin-search">
            <IconSearch width="15" height="15" />
            <input
              type="search"
              placeholder="Search name, brand, part no…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="admin-stock-tabs">
            {[
              { id: 'all', label: `All (${counts.all})` },
              { id: 'ok', label: `In stock (${counts.ok})` },
              { id: 'low', label: `Low (${counts.low})` },
              { id: 'out', label: `Out (${counts.out})` },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`admin-stock-tab ${stockFilter === tab.id ? 'active' : ''}`}
                onClick={() => setStockFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>MRP</th>
                <th>Stock</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    No products match.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className={`admin-stock-${statusOf(p)}`}>
                  <td>
                    <div className="admin-prod">
                      <img className="admin-prod-thumb" src={thumb(p)} alt="" loading="lazy" />
                      <div className="admin-prod-info">
                        <div className="admin-prod-name">
                          <InlineField
                            value={p.name}
                            type="text"
                            className="admin-name"
                            onSave={(v) => saveField(p.id, 'name', v)}
                          />
                        </div>
                        <div className="admin-prod-meta">
                          <span className="admin-prod-brand">{p.brand}</span>
                          {p.part_no && <span className="admin-prod-part">#{p.part_no}</span>}
                          <span className="admin-prod-id">{p.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-cat">
                      {getCategory(p.category)?.name || p.category || '—'}
                    </span>
                  </td>
                  <td>
                    <InlineField
                      value={p.price}
                      prefix="&#8377;"
                      onSave={(v) => saveField(p.id, 'price', v)}
                    />
                  </td>
                  <td>
                    <InlineField
                      value={p.mrp}
                      prefix="&#8377;"
                      onSave={(v) => saveField(p.id, 'mrp', v)}
                    />
                  </td>
                  <td>
                    <InlineField
                      value={p.stock}
                      className="admin-stock"
                      onSave={(v) => saveField(p.id, 'stock', v)}
                    />
                    <span className={`admin-stock-tag ${statusOf(p)}`}>
                      {statusOf(p) === 'out' ? 'Out of stock' : statusOf(p) === 'low' ? 'Low' : 'Ok'}
                    </span>
                  </td>
                  <td>
                    <span className="admin-rating">{p.rating ?? '—'}</span>
                    <span className="admin-reviews">
                      {p.reviews ?? 0} <span className="admin-reviews-label">reviews</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddProduct onClose={() => setShowAdd(false)} />}
    </div>
  )
}

export default function Admin() {
  const { isSeller, sellerReady } = useSeller()
  if (!sellerReady) {
    return (
      <div className="admin-page">
        <div className="container admin-loading">Checking session&#8230;</div>
      </div>
    )
  }
  return isSeller ? <Dashboard /> : <AdminLogin />
}