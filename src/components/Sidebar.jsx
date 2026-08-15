import { NavLink, useNavigate } from 'react-router-dom'
import { categories } from '../data'
import { useStore } from '../context/useStore'
import ProductArt from './ProductArt'
import VehicleGarage from './VehicleGarage'
import {
  IconCar,
  IconGauge,
  IconHeart,
  IconPackage,
  IconWrench,
  IconPhone,
  IconFilterFlat,
  IconSpark,
  IconDroplet,
  IconGear,
  IconBattery,
  IconUser,
  IconBox,
  IconRefreshCw,
} from './icons'

const catIcons = {
  braking: IconGauge,
  filters: IconFilterFlat,
  engine: IconSpark,
  suspension: IconCar,
  electrical: IconBattery,
  cooling: IconDroplet,
  transmission: IconGear,
  care: IconPackage,
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const { mode, toggleMode } = useStore()

  const go = (path) => {
    navigate(path)
    onClose?.()
  }

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-inner">
          <div className="brand-row">
            <button
              className="brand"
              onClick={() => go('/')}
              aria-label="SpareXpress home"
            >
              <span className="brand-mark">
                <img className="brand-logo" src="/logo.png" alt="SpareXpress" />
              </span>
              <span className="brand-name">
                SPARE<span className="brand-accent">XPRESS</span>
              </span>
            </button>
          </div>

          <div className="mode-card">
            <div className="mode-head">
              <span className="mode-title">
                {mode === 'preowned' ? <IconGauge /> : <IconCar />}
                {mode === 'preowned' ? 'Pre-owned mode' : 'Retail mode'}
              </span>
              <span className="mode-hint">
                {mode === 'preowned' ? 'Certified used parts' : 'Brand new parts'}
              </span>
            </div>
            <div className="mode-switch" role="button" tabIndex="0" onClick={toggleMode}>
              <span className={mode === 'retail' ? 'on' : ''}>Retail</span>
              <span className={mode === 'preowned' ? 'on' : ''}>Pre-owned</span>
            </div>
          </div>

          <nav className="side-nav" aria-label="Primary">
            <span className="nav-label">Browse</span>
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconPackage /> All parts
            </NavLink>

            <span className="nav-label nav-label-gap">Categories</span>
            {categories.map((c) => {
              const CatIcon = catIcons[c.icon] || IconWrench
              return (
                <button
                  key={c.id}
                  className="nav-item nav-btn"
                  onClick={() => go(`/shop?cat=${c.id}`)}
                >
                  <CatIcon width="19" height="19" />
                  <span className="nav-text">{c.short}</span>
                  <span className="nav-art">
                    <ProductArt category={c.icon} className="nav-art-svg" showImage={false} />
                  </span>
                </button>
              )
            })}

            <span className="nav-label nav-label-gap">My garage</span>
            <div className="side-garage">
              <VehicleGarage />
            </div>

            <span className="nav-label nav-label-gap">Account</span>
            <NavLink to="/account" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconUser /> My account
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconBox /> My orders
            </NavLink>
            <NavLink to="/wishlist" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconHeart /> Wishlist
            </NavLink>
            <NavLink to="/returns" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <IconRefreshCw /> Returns &amp; warranty
            </NavLink>
          </nav>

          <div className="side-foot">
            <div className="side-contact">
              <IconPhone width="16" height="16" />
              <div>
                <strong>+91 93393 32933</strong>
                <span>Mon–Sat · 9am–8pm</span>
              </div>
            </div>
            <p className="side-note">
              Genuine parts · GST invoice · Metro delivery in 12 hrs
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
