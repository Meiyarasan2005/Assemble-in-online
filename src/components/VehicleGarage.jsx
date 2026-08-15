import { useMemo } from 'react'
import { vehicles } from '../data'
import { useStore } from '../context/useStore'
import { IconCar, IconPlus, IconTrash, IconCheck } from './icons'

export default function VehicleGarage({ compact = false }) {
  const { garage, activeVehicle, addVehicle, removeVehicle, setActiveVehicle } = useStore()

  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [])
  const saved = garage.map((id) => byId.get(id)).filter(Boolean)
  const unsaved = vehicles.filter((v) => !garage.includes(v.id))

  const active = byId.get(activeVehicle)

  return (
    <div className={compact ? 'garage garage--compact' : 'garage'}>
      <div className="garage-head">
        <IconCar width={15} height={15} />
        <span>My garage</span>
      </div>

      {saved.length > 0 && (
        <ul className="garage-list">
          {saved.map((v) => {
            const isActive = v.id === activeVehicle
            return (
              <li key={v.id} className={isActive ? 'is-active' : ''}>
                <button
                  type="button"
                  className="garage-item"
                  onClick={() => setActiveVehicle(v.id)}
                >
                  <span className="garage-item-name">
                    {v.make} {v.model}
                  </span>
                  <span className="garage-item-sub">
                    {v.engine} · {v.years}
                  </span>
                </button>
                <span className="garage-actions">
                  {isActive && <IconCheck width={14} height={14} className="garage-check" />}
                  <button
                    type="button"
                    className="icon-btn icon-btn--ghost"
                    aria-label={`Remove ${v.model}`}
                    onClick={() => removeVehicle(v.id)}
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {unsaved.length > 0 && (
        <div className="garage-add">
          <label className="garage-label" htmlFor="garage-add-select">
            Add a vehicle
          </label>
          <select
            id="garage-add-select"
            value=""
            onChange={(e) => {
              if (e.target.value) addVehicle(e.target.value)
            }}
          >
            <option value="">Select make &amp; model…</option>
            {unsaved.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model}
              </option>
            ))}
          </select>
          <span className="garage-add-hint">
            <IconPlus width={13} height={13} /> Saved in your garage
          </span>
        </div>
      )}

      {saved.length === 0 && !compact && (
        <p className="garage-empty">
          Add your car to instantly see parts that fit it across the store.
        </p>
      )}

      {active && (
        <div className="garage-active-note">
          Active: {active.make} {active.model} · {active.engine}
        </div>
      )}
    </div>
  )
}
