import { Link } from 'react-router-dom'
import { formatINR, getCategory, vehicles } from '../data'
import { useStore } from '../context/useStore'
import { t } from '../lib/i18n'
import ProductArt from './ProductArt'
import { IconPlus, IconStar, IconHeart } from './icons'

const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

export default function ProductCard({ product, compact = false }) {
  const { addToCart, activeVehicle, wishlist, toggleWishlist, priceWatch, lang } = useStore()
  const cat = getCategory(product.category)
  const pre = Boolean(product.condition)
  const shown = product.price
  const save = product.mrp - shown
  const out = product.stock === 0
  const wished = wishlist.includes(product.id)
  const fitsActive = activeVehicle && product.fits?.includes(activeVehicle)
  const activeV = vehicleById.get(activeVehicle)
  const dropped = priceWatch[product.id] != null && product.price < priceWatch[product.id]

  return (
    <article className={`pcard card ${compact ? 'pcard-compact' : ''}`}>
      <Link to={`/product/${product.id}`} className="pcard-art-wrap">
        <span className={`pcard-art pcard-art-${cat.id}`}>
          <ProductArt category={cat.icon} />
        </span>
        <span className="pcard-badges">
          {product.badge === 'sale' && <span className="badge badge-sale">Sale</span>}
          {product.badge === 'new' && <span className="badge badge-new">New</span>}
          {product.badge === 'top' && <span className="badge badge-top">Best seller</span>}
          {product.badge === 'low' && <span className="badge badge-low">Few left</span>}
          {pre && <span className="badge badge-pre">Pre-owned</span>}
          {dropped && <span className="badge badge-drop">Price drop</span>}
        </span>
      </Link>

      {fitsActive && activeV && (
        <span className="fit-ribbon">{t('fitsYourCar', lang, { v: activeV.model })}</span>
      )}

      <div className="pcard-body">
        <div className="pcard-meta">
          <span className="pcard-brand">{product.brand}</span>
          <span className="pcard-partno">{product.partNo}</span>
        </div>
        {pre && (
          <span className="pcard-cond">
            {product.condition} · {product.km}
          </span>
        )}
        <Link to={`/product/${product.id}`} className="pcard-name">
          {product.name}
        </Link>
        <div className="pcard-rating">
          <IconStar className="star" />
          <span>{product.rating}</span>
          <span className="pcard-reviews">({product.reviews})</span>
        </div>

        <div className="pcard-foot">
          <div>
            {pre && (
              <div className="pcard-pre">
                <span className="pcard-mrp">New {formatINR(product.mrp)}</span>
                <span className="pcard-save">Save {formatINR(save)}</span>
              </div>
            )}
            <div className="pcard-price">{formatINR(shown)}</div>
          </div>
          <div className="pcard-cta">
            <button
              type="button"
              className={`icon-btn wish-btn wish-btn--card ${wished ? 'is-wished' : ''}`}
              onClick={() => toggleWishlist(product.id)}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <IconHeart width="16" height="16" />
            </button>
            <button
              className="btn btn-primary btn-sm pcard-add"
              disabled={out}
              onClick={() => addToCart(product.id)}
              aria-label={`Add ${product.name} to cart`}
            >
              <IconPlus width="16" height="16" />
              {out ? 'Out' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
