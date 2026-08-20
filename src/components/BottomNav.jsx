import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../context/useStore'
import { IconCart, IconHeart, IconUser, IconSearch, IconHome } from './icons'

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: IconHome },
  { path: '/shop', label: 'Shop', icon: IconSearch },
  { path: '/cart', label: 'Cart', icon: IconCart, isCart: true },
  { path: '/wishlist', label: 'Wishlist', icon: IconHeart, isWish: true },
  { path: '/account', label: 'Account', icon: IconUser },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartCount, wishlist, setCartOpen } = useStore()

  const handleTap = (item) => {
    if (item.isCart) {
      setCartOpen(true)
    } else {
      navigate(item.path)
    }
  }

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = location.pathname === item.path ||
          (item.path === '/shop' && location.pathname.startsWith('/shop')) ||
          (item.path === '/account' && ['/account', '/profile'].includes(location.pathname))

        let count = 0
        if (item.isCart) count = cartCount
        if (item.isWish) count = wishlist.length

        return (
          <button
            key={item.path}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => handleTap(item)}
          >
            <span className="bottom-nav-icon">
              <Icon width="22" height="22" />
              {count > 0 && <span className="bottom-nav-badge">{count}</span>}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
