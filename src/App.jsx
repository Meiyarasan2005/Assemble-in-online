import { useEffect, useState } from 'react'
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext.jsx'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import CartDrawer from './components/CartDrawer'
import Toast from './components/Toast'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Checkout from './pages/Checkout'
import OrderConfirm from './pages/OrderConfirm'
import Orders from './pages/Orders'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Wishlist from './pages/Wishlist'
import Returns from './pages/Returns'
import BgFX from './components/BgFX'
import Preloader from './components/Preloader'
import PriceWatcher from './components/PriceWatcher'
import { IconMapPin, IconPhone } from './components/icons'

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, search])
  return null
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand">
            <img className="footer-logo" src="/logo.png" alt="SpareXpress logo" />
            <span className="brand-name">
              SPARE<span className="brand-accent">XPRESS</span>
            </span>
          </div>
          <p className="footer-tag">
            The marketplace for genuine car spare parts, OE & after-market
            lines — built for workshops and car owners.
          </p>
          <div className="footer-contact">
            <span>
              <IconPhone width="14" height="14" /> +91 93393 32933
            </span>
            <span>
              <IconMapPin width="14" height="14" /> Pune · serving all of India
            </span>
          </div>
        </div>
        <div>
          <strong>Shop</strong>
          <Link to="/shop">All parts</Link>
          <Link to="/shop?fitment=1">Fitment finder</Link>
          <Link to="/shop">Bestsellers</Link>
          <Link to="/shop">New arrivals</Link>
        </div>
        <div>
          <strong>Company</strong>
          <a href="#about">About us</a>
          <a href="#careers">Careers</a>
          <a href="#press">Press</a>
          <a href="#contact">Contact</a>
        </div>
        <div>
          <strong>Support</strong>
          <Link to="/orders">Track orders</Link>
          <Link to="/returns">Returns &amp; warranty</Link>
          <Link to="/wishlist">Wishlist</Link>
          <a href="#help">Help centre</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 SpareXpress Retail & Trade Pvt. Ltd.</span>
        <span>GST invoices · Secure payments · Verified fitment</span>
      </div>
    </footer>
  )
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [preloadHiding, setPreloadHiding] = useState(false)
  const [preloadGone, setPreloadGone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPreloadHiding(true), 1600)
    const t2 = setTimeout(() => setPreloadGone(true), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="app">
      {!preloadGone && <Preloader hiding={preloadHiding} />}
      <BgFX />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="content">
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/order/:id" element={<OrderConfirm />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <PriceWatcher />
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  )
}
