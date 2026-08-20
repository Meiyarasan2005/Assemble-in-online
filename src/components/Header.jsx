import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../context/useStore'
import { useSeller } from '../context/useSeller'
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
import SellerLogin from './SellerLogin'

export default function Header() {
  const navigate = useNavigate()
  const { cartCount, setCartOpen, isAuthed, customer, wishlist, mode, toggleMode } = useStore()
  const { isSeller, seller, logout: sellerLogout } = useSeller()
  const { products } = useCatalog()
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSellerLogin, setShowSellerLogin] = useState(false)
  const [loginDrop, setLoginDrop] = useState(false)
  const dropRef = useRef(null)
  const blurTimer = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setLoginDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
      <header className="header">
        <div className="header-inner container">
          <Link to="/" className="header-brand">
            <img className="header-logo" src="/favicon.png" alt="SpareXpress" />
            <span className="header-brand-text">
              SPARE<span className="header-brand-accent">XPRESS</span>
            </span>
          </Link>

          <form className="header-search" onSubmit={submit} onBlur={() => (blurTimer.current = setTimeout(() => setFocus(false), 150))}>
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

            {isSeller ? (
              <div className="header-login-split header-login-seller" ref={dropRef}>
                <button className="header-login-main seller-active-main" onClick={() => setLoginDrop(!loginDrop)}>
                  <span className="seller-dot" />
                  <span className="header-btn-text">{seller?.username}</span>
                  <span className="seller-edit-hint">Editing ON</span>
                </button>
                {loginDrop && (
                  <div className="header-login-drop">
                    <div className="header-login-drop-head">
                      <span className="seller-dot" />
                      <span>Seller Mode Active</span>
                    </div>
                    <button className="header-login-drop-item" onClick={() => { setLoginDrop(false); navigate('/account') }}>
                      <IconUser width="14" height="14" /> My Customer Account
                    </button>
                    <button className="header-login-drop-item header-login-drop-danger" onClick={() => { sellerLogout(); setLoginDrop(false) }}>
                      Logout Seller
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="header-login-split" ref={dropRef}>
                <button className="header-login-main" onClick={() => navigate('/account')}>
                  <IconUser width="16" height="16" />
                  <span className="header-btn-text">{isAuthed ? (customer?.name?.split(' ')[0] || 'Account') : 'Login'}</span>
                </button>
                <button className="header-login-arrow" onClick={(e) => { e.stopPropagation(); setLoginDrop(!loginDrop) }} aria-label="Login options">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {loginDrop && (
                  <div className="header-login-drop">
                    <div className="header-login-drop-head">Login as</div>
                    <button className="header-login-drop-item" onClick={() => { setLoginDrop(false); navigate('/account') }}>
                      <IconUser width="14" height="14" /> Customer
                    </button>
                    <button className="header-login-drop-item" onClick={() => { setLoginDrop(false); setShowSellerLogin(true) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      Seller
                    </button>
                    {isAuthed && (
                      <button className="header-login-drop-item header-login-drop-danger" onClick={() => { setLoginDrop(false); navigate('/account') }}>
                        Logout
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

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
              {isSeller ? (
                <button className="mobile-seller-active" onClick={() => { sellerLogout(); setMobileMenuOpen(false) }}>
                  <span className="seller-dot" /> Seller Mode: {seller?.username} (tap to logout)
                </button>
              ) : (
                <button onClick={() => { setShowSellerLogin(true); setMobileMenuOpen(false) }}>
                  Seller Login
                </button>
              )}
              <button className={`mode-pill ${mode === 'preowned' ? 'is-preowned' : ''}`} onClick={() => { toggleMode(); setMobileMenuOpen(false) }}>
                <span className="mode-pill-track"><span className="mode-pill-thumb" /></span>
                <span className="mode-pill-label">{mode === 'preowned' ? 'Switch to New Parts' : 'Switch to Pre-Owned'}</span>
              </button>
              <Link to="/account" onClick={() => setMobileMenuOpen(false)}>
                {isAuthed ? 'My Account' : 'Login / Register'}
              </Link>
            </nav>
          </div>
        </div>
      )}
      {showSellerLogin && (
        <SellerLogin onClose={() => setShowSellerLogin(false)} />
      )}
    </>
  )
}
