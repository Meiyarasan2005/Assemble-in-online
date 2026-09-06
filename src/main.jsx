import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './css/layout.css'
import './css/products.css'
import './css/home.css'
import './css/shop.css'
import './css/components.css'
import './css/animate.css'
import './css/car.css'
import './css/checkout.css'
import './css/auth.css'
import './css/profile.css'
import './css/features.css'
import './css/premium.css'
import './css/seller.css'
import './css/loader.css'
import './css/contact.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const check = () => reg.update().catch(() => {})
        setInterval(check, 4 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) check()
        })
      })
      .catch(() => {
        /* offline shell unavailable */
      })
  })
}
