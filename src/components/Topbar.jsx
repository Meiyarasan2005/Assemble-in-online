import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import { findInterchanges, interchangesFor } from '../data'
import { t, LANGS } from '../lib/i18n'
import VehicleGarage from './VehicleGarage'
import {
  IconBox,
  IconCart,
  IconChevronDown,
  IconMenu,
  IconSearch,
  IconCar,
  IconUser,
  IconHeart,
  IconGlobe,
} from './icons'

export default function Topbar({ onMenu }) {
  const navigate = useNavigate()
  const { cartCount, setCartOpen, isAuthed, customer, wishlist, lang, setLang } = useStore()
  const { products } = useCatalog()
  const headerRef = useRef(null)
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)
  const [garageOpen, setGarageOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const blurTimer = useRef(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const onScroll = () => {
      el.classList.toggle('scrolled', window.scrollY > 30)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
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
    <header className="topbar" ref={headerRef}>
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
        <IconMenu />
      </button>

      <form className="search" onSubmit={submit} onBlur={() => (blurTimer.current = setTimeout(() => setFocus(false), 150))}>
        <span className="search-icon">
          <IconSearch width="18" height="18" />
        </span>
        <input
          className="search-input"
          type="search"
          placeholder={t('searchPlaceholder', lang)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocus(true)}
          aria-label="Search parts"
        />
        <button type="submit" className="btn btn-primary btn-search">
          {t('search', lang)}
        </button>
        {focus && query.trim() && (
          <div className="search-drop card" onMouseDown={(e) => e.preventDefault()}>
            {results.length === 0 && (
              <p className="search-empty">
                No matches for “{query}”. Try a part number, OEM number, name or brand.
              </p>
            )}
            {results.map((p) => (
              <button key={p.id} className="search-row" onClick={() => pick(p.id)}>
                <span className="search-row-no">{p.partNo}</span>
                <span className="search-row-name">{p.name}</span>
                <span className="search-row-brand">{p.brand}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="topbar-actions">
        <div className="pop-wrap">
          <button
            className={`fit-btn ${garageOpen ? 'is-open' : ''}`}
            onClick={() => setGarageOpen((o) => !o)}
            title="Manage your vehicles"
          >
            <IconCar width="18" height="18" />
            <span>{t('myCar', lang)}</span>
            <IconChevronDown width="15" height="15" />
          </button>
          {garageOpen && (
            <>
              <div className="pop-backdrop" onClick={() => setGarageOpen(false)} />
              <div className="pop-card card">
                <VehicleGarage compact />
                <button
                  type="button"
                  className="garage-open-link"
                  onClick={() => {
                    setGarageOpen(false)
                    navigate('/garage')
                  }}
                >
                  Open my garage <IconChevronDown width="14" height="14" className="garage-open-arrow" />
                </button>
              </div>
            </>
          )}
        </div>

        <button className="fit-btn" onClick={() => navigate('/orders')} title="Track my orders">
          <IconBox width="18" height="18" />
          <span>{t('orders', lang)}</span>
        </button>

        <div className="pop-wrap">
          <button
            className="icon-btn lang-btn"
            onClick={() => setLangOpen((o) => !o)}
            aria-label="Choose language"
          >
            <IconGlobe width="19" height="19" />
            <span className="lang-cur">{LANGS.find((l) => l.code === lang)?.label || 'EN'}</span>
          </button>
          {langOpen && (
            <>
              <div className="pop-backdrop" onClick={() => setLangOpen(false)} />
              <div className="pop-card pop-card--lang card">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`lang-option ${l.code === lang ? 'is-active' : ''}`}
                    onClick={() => {
                      setLang(l.code)
                      setLangOpen(false)
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          className="icon-btn wish-btn"
          onClick={() => navigate('/wishlist')}
          aria-label={`Wishlist, ${wishlist.length} items`}
        >
          <IconHeart width="21" height="21" />
          {wishlist.length > 0 && <span className="cart-badge wish-badge">{wishlist.length}</span>}
        </button>

        <button
          className="fit-btn account-btn"
          onClick={() => navigate('/account')}
          title={isAuthed ? `Signed in as +91 ${customer.phone}` : 'Log in or create an account'}
        >
          <IconUser width="18" height="18" />
          <span>{isAuthed ? (customer.name.split(' ')[0] || 'Account') : t('login', lang)}</span>
        </button>

        <button
          className="icon-btn cart-btn"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${cartCount} items`}
        >
          <IconCart width="22" height="22" />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  )
}
