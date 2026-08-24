import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './context/StoreContext.jsx'
import { SellerProvider } from './context/SellerContext.jsx'
import Header from './components/Header'
import BottomNav from './components/BottomNav'

import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Toast from './components/Toast'
import PageTransition from './components/PageTransition'
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
import Garage from './pages/Garage'
import PriceWatcher from './components/PriceWatcher'
import SearchPage from './pages/SearchPage'

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, search])
  return null
}

function Shell() {
  return (
    <div className="app">
      <Header />
      <div className="main">
        <main className="content">
          <ScrollToTop />
          <PageTransition>
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
              <Route path="/garage" element={<Garage />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </PageTransition>
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <BottomNav />
      <PriceWatcher />
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <SellerProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </SellerProvider>
    </StoreProvider>
  )
}
