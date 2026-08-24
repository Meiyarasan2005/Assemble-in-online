import { Link } from 'react-router-dom'
import { IconPhone, IconMapPin } from './icons'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand">
              <img className="footer-logo" src="/logo.png" alt="Assemble-on-line logo" />
              <span className="footer-brand-text">
                SPARE<span className="footer-brand-accent">XPRESS</span>
              </span>
            </Link>
            <p className="footer-tagline">
              The marketplace for genuine car spare parts, OE &amp; after-market
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

          <div className="footer-col">
            <strong>Shop</strong>
            <Link to="/shop">All parts</Link>
            <Link to="/shop?fitment=1">Fitment finder</Link>
            <Link to="/shop">Bestsellers</Link>
            <Link to="/shop">New arrivals</Link>
          </div>

          <div className="footer-col">
            <strong>Company</strong>
            <a href="#about">About us</a>
            <a href="#careers">Careers</a>
            <a href="#press">Press</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-col">
            <strong>Support</strong>
            <Link to="/orders">Track orders</Link>
            <Link to="/returns">Returns &amp; warranty</Link>
            <Link to="/wishlist">Wishlist</Link>
            <a href="#help">Help centre</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner container">
          <span>© 2026 Assemble-on-line Retail & Trade Pvt. Ltd.</span>
          <span className="footer-trust">GST invoices · Secure payments · Verified fitment</span>
        </div>
      </div>
    </footer>
  )
}
