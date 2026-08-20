import { useNavigate } from 'react-router-dom'
import { categories } from '../data'
import {
  IconGauge,
  IconFilterFlat,
  IconSpark,
  IconCar,
  IconBattery,
  IconDroplet,
  IconGear,
  IconPackage,
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

export default function CategoryBar() {
  const navigate = useNavigate()

  return (
    <nav className="catbar" aria-label="Categories">
      <div className="catbar-inner container">
        {categories.map((c) => {
          const CatIcon = catIcons[c.icon] || IconPackage
          return (
            <button
              key={c.id}
              className="catbar-item"
              onClick={() => navigate(`/shop?cat=${c.id}`)}
            >
              <span className="catbar-icon">
                <CatIcon width="22" height="22" />
              </span>
              <span className="catbar-label">{c.short}</span>
            </button>
          )
        })}
        <button className="catbar-item catbar-item-all" onClick={() => navigate('/shop')}>
          <span className="catbar-icon">
            <IconPackage width="22" height="22" />
          </span>
          <span className="catbar-label">All Parts</span>
        </button>
      </div>
    </nav>
  )
}
