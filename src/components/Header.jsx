import { useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import { findInterchanges, interchangesFor } from '../data'
import {
  IconCart,
  IconSearch,
  IconUser,
  IconHeart,
  IconBox,
  IconMenu,
  IconX,
} from './icons'

export default function Header() {
  const navigate = useNavigate()
  const { cartCount, setCartOpen, isAuthed, customer, wishlist, mode, toggleMode } = useStore()
  const { products } = useCatalog()
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const blurTimer = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const ixMatches = findInterchanges(query)
    const ixIds = new Set(ixMatches.map((i) => i.partNo.toLowerCase()))
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.partNo} ${p.brand}`.toLowerCase()
        if (hay.includes(q)) return true
        const xrefs = interchangesFor(p.partNo)
        return xrefs.some(
          (x) =>
            x.oem.toLowerCase().includes(q) ||
            (ixIds.size > 0 && ixIds.has(x.partNo.toLowerCase())),
        )
      })
      .slice(0, 6)
  }, [query, products])

  const submit = (e) => {
    e.preventDefault()
    const q = query.trim()
    setFocus(false)
    if (q) navigate(`/shop?q=${encodeURIComponent(q)}`)
    else navigate('/shop')
  }

  const pick = (id) => {
    setFocus(false)
    navigate(`/product/${id}`)
  }

  return (
    <>
      <header className="header header-minimal">
        <div className="header-inner container">
          <Link to="/" className="header-brand">
            <img className="header-logo" src="/favicon.png" alt="Assemble-on-line" />
          </Link>

          <form className="header-search header-search-desktop" onSubmit={submit} onBlur={() => (blurTimer.current = setTimeout(() => setFocus(false), 150))}>
            <IconSearch width="18" height="18" className="header-search-icon" />
            <input
              className="header-search-input"
              type="search"
              placeholder="Search by part number, name or brand..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocus(true)}
              aria-label="Search parts"
            />
            {focus && query.trim() && (
              <div className="header-search-drop" onMouseDown={(e) => e.preventDefault()}>
                {results.length === 0 && (
                  <p className="header-search-empty">
                    No matches for "{query}". Try a part number, name or brand.
                  </p>
                )}
                {results.map((p) => (
                  <button key={p.id} className="header-search-row" onClick={() => pick(p.id)}>
                    <span className="header-search-row-no">{p.partNo}</span>
                    <span className="header-search-row-name">{p.name}</span>
                    <span className="header-search-row-brand">{p.brand}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <button className="header-search-mobile" onClick={() => navigate('/search')} aria-label="Search">
            <IconSearch width="20" height="20" />
            <span>Search parts...</span>
          </button>

          <div className="header-actions">
            <button className={`mode-pill ${mode === 'preowned' ? 'is-preowned' : ''}`} onClick={toggleMode}>
              <span className="mode-pill-track">
                <span className="mode-pill-thumb" />
              </span>
              <span className="mode-pill-label">{mode === 'preowned' ? 'Pre-Owned' : 'New Parts'}</span>
            </button>

            <button className="header-btn" onClick={() => navigate('/orders')}>
              <IconBox width="18" height="18" />
              <span className="header-btn-text">Orders</span>
            </button>

            <button className="header-btn" onClick={() => navigate('/wishlist')}>
              <IconHeart width="18" height="18" />
              {wishlist.length > 0 && <span className="header-badge">{wishlist.length}</span>}
              <span className="header-btn-text">Wishlist</span>
            </button>

            <button className="header-btn" onClick={() => navigate('/account')}>
              <IconUser width="16" height="16" />
              <span className="header-btn-text">{isAuthed ? (customer?.name?.split(' ')[0] || 'Account') : 'Login'}</span>
            </button>

            <button className="header-btn header-cart-btn" onClick={() => setCartOpen(true)}>
              <IconCart width="20" height="20" />
              {cartCount > 0 && <span className="header-badge header-badge-cart">{cartCount}</span>}
              <span className="header-btn-text">Cart</span>
            </button>
          </div>

          <button className="header-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <IconMenu width="22" height="22" />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-head">
              <span className="mobile-menu-title">Menu</span>
              <button className="icon-btn" onClick={() => setMobileMenuOpen(false)}>
                <IconX width="20" height="20" />
              </button>
            </div>
            <nav className="mobile-menu-nav">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/shop" onClick={() => setMobileMenuOpen(false)}>All Parts</Link>
              <Link to="/garage" onClick={() => setMobileMenuOpen(false)}>My Garage</Link>
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
              <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
              <Link to="/returns" onClick={() => setMobileMenuOpen(false)}>Returns & Warranty</Link>
              <Link to="/account" onClick={() => setMobileMenuOpen(false)}>
                {isAuthed ? 'My Account' : 'Login / Register'}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
