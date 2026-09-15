import { Link, useNavigate } from 'react-router-dom'
import { getCategory } from '../data'
import { useStore } from '../context/useStore'
import ProductArt from './ProductArt'
import { IconX, IconMinus, IconPlus, IconTrash, IconTruck, IconShield, IconCart, IconArrowRight } from './icons'

export default function CartDrawer() {
  const navigate = useNavigate()
  const { cartOpen, setCartOpen, lines, setQty, removeFromCart, clearCart, mode } = useStore()

  const goCheckout = () => {
    setCartOpen(false)
    navigate('/checkout')
  }

  return (
    <>
      <div className={`drawer-backdrop ${cartOpen ? 'show' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen}>
        <div className="drawer-head">
          <div>
            <h3>My Cart</h3>
            <span className="drawer-sub">{lines.length} {lines.length === 1 ? 'item' : 'items'}</span>
          </div>
          <button className="drawer-close" onClick={() => setCartOpen(false)} aria-label="Close cart">
            <IconX width="20" height="20" />
          </button>
        </div>

        <div className="drawer-body">
          {lines.length === 0 ? (
            <div className="drawer-empty">
              <IconCart width="48" height="48" />
              <p>Your cart is empty</p>
              <span>Add some genuine parts to get started.</span>
              <Link to="/shop" className="btn btn-primary" onClick={() => setCartOpen(false)}>
                Browse parts
              </Link>
            </div>
          ) : (
            <ul className="cart-lines">
              {lines.map(({ product, qty }) => {
                const cat = getCategory(product.category)
                return (
                  <li key={product.id} className="cart-line">
                    <Link to={`/product/${product.id}`} className={`cart-art cart-art-${cat.id}`} onClick={() => setCartOpen(false)}>
                      <ProductArt category={cat.icon} />
                    </Link>
                    <div className="cart-line-info">
                      <Link to={`/product/${product.id}`} className="cart-line-name" onClick={() => setCartOpen(false)}>
                        {product.name}
                      </Link>
                      <span className="cart-line-no">Part: {product.partNo}</span>
                      <div className="qty-row">
                        <button className="qty-btn" onClick={() => setQty(product.id, qty - 1)} aria-label="Decrease quantity">
                          <IconMinus width="14" height="14" />
                        </button>
                        <span className="qty-val">{qty}</span>
                        <button className="qty-btn" onClick={() => setQty(product.id, qty + 1)} aria-label="Increase quantity">
                          <IconPlus width="14" height="14" />
                        </button>
                        <button className="qty-btn qty-remove" onClick={() => removeFromCart(product.id)} aria-label="Remove item">
                          <IconTrash width="14" height="14" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="drawer-foot">
            <div className="drawer-rows">
              <div className="dr"><span>Items</span><span>{lines.reduce((n, l) => n + l.qty, 0)}</span></div>
              <div className="dr"><span>Delivery</span><span>At checkout</span></div>
            </div>
            <button className="btn btn-primary btn-block" onClick={goCheckout}>
              Place Order <IconArrowRight width="16" height="16" />
            </button>
            <button className="btn btn-block btn-sm drawer-clear" onClick={clearCart}>Clear cart</button>
            <div className="drawer-perks">
              <span><IconTruck width="14" height="14" /> 12-hr metro delivery</span>
              <span><IconShield width="14" height="14" /> 100% genuine</span>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
