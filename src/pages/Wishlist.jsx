import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'
import ProductArt from '../components/ProductArt'
import { IconArrowLeft, IconArrowRight, IconHeart } from '../components/icons'

export default function Wishlist() {
  const navigate = useNavigate()
  const { wishlist } = useStore()
  const { products } = useCatalog()

  const items = products.filter((p) => wishlist.includes(p.id))

  return (
    <div className="container">
      <button className="pd-back" onClick={() => navigate(-1)}>
        <IconArrowLeft width="18" height="18" /> Back
      </button>

      <div className="sec-head wishlist-head">
        <div>
          <div className="sec-kicker">Saved parts</div>
          <h1>Wishlist {items.length > 0 && <span className="wishlist-count">({items.length})</span>}</h1>
          <p className="wishlist-sub">
            Parts you save are tracked for price drops — we'll alert you here and in the shop.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state card">
          <span className="wishlist-empty-icon">
            <IconHeart width="34" height="34" />
          </span>
          <h3>Your wishlist is empty</h3>
          <p>Tap the heart on any part to save it here and start tracking price drops.</p>
          <Link to="/shop" className="btn btn-primary">
            Browse parts <IconArrowRight width="15" height="15" />
          </Link>
        </div>
      ) : (
        <div className="grid-products">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="wishlist-note card">
          <ProductArt category="care" />
          <p>
            Prices can move daily. Save more parts and check back — items with a lower price than
            your last visit get a <strong>Price drop</strong> tag automatically.
          </p>
        </div>
      )}
    </div>
  )
}
