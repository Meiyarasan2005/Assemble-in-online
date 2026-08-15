import { useMemo, useState } from 'react'
import useCatalog from '../hooks/useCatalog'
import { useStore } from '../context/useStore'
import { t } from '../lib/i18n'
import { IconCheck, IconCar, IconTool, IconX } from './icons'

const makeList = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Toyota', 'Honda', 'Kia', 'Volkswagen', 'Skoda', 'Renault', 'Nissan', 'MG', 'Ford', 'Jeep', 'Mercedes-Benz', 'BMW', 'Audi', 'Citroën']

export default function FitmentWizard({ product }) {
  const { vehicles } = useCatalog()
  const { activeVehicle, lang } = useStore()
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')

  const models = useMemo(
    () => (make ? vehicles.filter((v) => v.make === make) : []),
    [make, vehicles],
  )

  const picked = useMemo(() => vehicles.find((v) => v.id === model), [vehicles, model])

  const fitsId = (id) => product.fits.includes(id)
  const sameFamily = (id) => {
    const v = vehicles.find((x) => x.id === id)
    return v && product.fits.some((f) => vehicles.find((x) => x.id === f)?.make === v.make)
  }

  const activePicked = activeVehicle ? vehicles.find((v) => v.id === activeVehicle) : null

  const verdict = picked
    ? fitsId(picked.id)
      ? 'fit'
      : sameFamily(picked.id)
        ? 'family'
        : 'no'
    : null

  return (
    <div className="fit-wiz card">
      <div className="fit-wiz-head">
        <span className="fit-wiz-icon">
          <IconCar width="17" height="17" />
        </span>
        <div>
          <strong>{t('checkFitment', lang)}</strong>
          <span>Does this fit your car?</span>
        </div>
      </div>

      {activePicked && (
        <button
          type="button"
          className={`fit-wiz-active ${fitsId(activePicked.id) ? 'is-fit' : sameFamily(activePicked.id) ? 'is-family' : 'is-no'}`}
          onClick={() => setModel(activePicked.id)}
        >
          <span>
            {activePicked.make} {activePicked.model}
          </span>
          <em>
            {fitsId(activePicked.id)
              ? t('compatible', lang)
              : sameFamily(activePicked.id)
                ? 'Same family · verify'
                : t('notCompatible', lang)}
          </em>
        </button>
      )}

      <div className="fit-wiz-selects">
        <select className="select" value={make} onChange={(e) => { setMake(e.target.value); setModel('') }} aria-label="Select make">
          <option value="">Make…</option>
          {makeList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className="select" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make} aria-label="Select model">
          <option value="">Model…</option>
          {models.map((v) => (
            <option key={v.id} value={v.id}>
              {v.model} · {v.years}
            </option>
          ))}
        </select>
      </div>

      {picked && (
        <div className={`fit-wiz-result is-${verdict}`}>
          {verdict === 'fit' && (
            <>
              <IconCheck width="17" height="17" />
              <span>
                <strong>{t('compatible', lang)}</strong>
                {picked.make} {picked.model} ({picked.engine}) is listed for this part.
              </span>
            </>
          )}
          {verdict === 'family' && (
            <>
              <IconTool width="17" height="17" />
              <span>
                <strong>Same family · verify</strong>
                Fits {picked.make} vehicles, but {picked.model} isn't on the confirmed list — verify the OEM number at checkout.
              </span>
            </>
          )}
          {verdict === 'no' && (
            <>
              <IconX width="17" height="17" />
              <span>
                <strong>{t('notCompatible', lang)}</strong>
                {picked.make} {picked.model} is not on the confirmed fitment list for this part.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
