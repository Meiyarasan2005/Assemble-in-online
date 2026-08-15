import { useEffect, useRef } from 'react'
import { getProduct } from '../data'
import { useStore } from '../context/useStore'
import useCatalog from '../hooks/useCatalog'
import { t } from '../lib/i18n'

export default function PriceWatcher() {
  const { wishlist, priceWatch, watchPrice, notify, lang } = useStore()
  const { products, ready } = useCatalog()
  const ran = useRef(false)

  useEffect(() => {
    if (!ready || ran.current) return
    if (wishlist.length === 0) return

    const byId = new Map(products.map((p) => [p.id, p]))
    const drops = []
    for (const id of wishlist) {
      const p = byId.get(id) || getProduct(id)
      if (!p) continue
      const last = priceWatch[id]
      if (last != null && p.price < last) {
        drops.push(p)
      }
      watchPrice(id, p.price)
    }

    if (drops.length > 0) {
      notify(t('priceDropped', lang, { n: drops.length }))
    }
    ran.current = true
  }, [ready, products, wishlist, priceWatch, watchPrice, notify, lang])

  return null
}
