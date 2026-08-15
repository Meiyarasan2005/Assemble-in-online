import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useCatalog from '../hooks/useCatalog'
import { findInterchanges } from '../data'
import { formatINR } from '../data'
import { IconSearch, IconCheck } from './icons'

export default function PartLookup() {
  const { products } = useCatalog()
  const [term, setTerm] = useState('')
  const [searched, setSearched] = useState('')

  const results = useMemo(() => {
    if (!searched) return null
    const entries = findInterchanges(searched)
    if (entries.length === 0) return []
    const rows = new Map()
    for (const e of entries) {
      const p = products.find((x) => x.partNo === e.partNo)
      rows.set(e.partNo, { entry: e, product: p })
    }
    return [...rows.values()]
  }, [searched, products])

  const submit = (e) => {
    e.preventDefault()
    setSearched(term.trim())
  }

  return (
    <div className="part-lookup card">
      <div className="part-lookup-head">
        <strong>OEM / part number lookup</strong>
        <span>Find which of our parts cross-reference a manufacturer number.</span>
      </div>
      <form className="part-lookup-form" onSubmit={submit}>
        <input
          className="input"
          type="search"
          placeholder="e.g. OEM 16510-21040, 17801-21060…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="OEM part number"
        />
        <button type="submit" className="btn btn-primary">
          <IconSearch width="16" height="16" /> Lookup
        </button>
      </form>

      {results && (
        <div className="part-lookup-results">
          {results.length === 0 && (
            <p className="part-lookup-empty">No cross-reference found for “{searched}”.</p>
          )}
          {results.map(({ entry, product }) => (
            <div key={entry.partNo} className="part-lookup-row">
              {product ? (
                <Link to={`/product/${product.id}`} className="part-lookup-link">
                  <span className="part-lookup-no">{entry.partNo}</span>
                  <span className="part-lookup-name">{product.name}</span>
                  <span className="part-lookup-brand">{entry.brand}</span>
                  <span className="part-lookup-price">{formatINR(product.price)}</span>
                  <span className="part-lookup-go">View →</span>
                </Link>
              ) : (
                <span className="part-lookup-row part-lookup-miss">
                  <span className="part-lookup-no">{entry.partNo}</span>
                  <span className="part-lookup-brand">{entry.brand}</span>
                  <span className="part-lookup-miss-note">Interchange for {entry.oem} — call to source</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!results && (
        <p className="part-lookup-hint">
          <IconCheck width="13" height="13" /> Works with OEM, aftermarket and brand part numbers.
        </p>
      )}
    </div>
  )
}
