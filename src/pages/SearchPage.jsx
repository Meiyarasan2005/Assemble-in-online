import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useCatalog from '../hooks/useCatalog'
import { findInterchanges, interchangesFor } from '../data'
import { formatINR } from '../data'
import { IconSearch, IconArrowLeft } from '../components/icons'
import ProductCard from '../components/ProductCard'

export default function SearchPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { products } = useCatalog()
  const inputRef = useRef(null)
  const [query, setQuery] = useState(params.get('q') || '')
  const [submitted, setSubmitted] = useState(Boolean(params.get('q')))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !submitted) return []
    const ixMatches = findInterchanges(query)
    const ixIds = new Set(ixMatches.map((i) => i.partNo.toLowerCase()))
    return products
      .filter((p) => {
        const hay = `${p.name} ${p.partNo} ${p.brand}`.toLowerCase()
        if (hay.includes(q)) return true
        const xrefs = interchangesFor(p.partNo)
        return xrefs.some(
          (x) =>
            x.oem.toLowerCase().includes(q) ||
            (ixIds.size > 0 && ixIds.has(x.partNo.toLowerCase())),
        )
      })
  }, [query, products, submitted])

  const submit = (e) => {
    e.preventDefault()
    if (query.trim()) setSubmitted(true)
  }

  return (
    <div className="search-page">
      <div className="search-page-header">
        <button className="search-page-back" onClick={() => navigate(-1)}>
          <IconArrowLeft width="20" height="20" />
        </button>
        <form className="search-page-form" onSubmit={submit}>
          <IconSearch width="18" height="18" className="search-page-icon" />
          <input
            ref={inputRef}
            className="search-page-input"
            type="search"
            placeholder="Search parts, brands, part numbers..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSubmitted(false) }}
          />
        </form>
      </div>

      <div className="search-page-results">
        {submitted && results.length === 0 && (
          <div className="search-page-empty">
            <p>No results for "<strong>{query}</strong>"</p>
            <span>Try a different part number, name or brand.</span>
          </div>
        )}
        {submitted && results.length > 0 && (
          <div className="search-page-count">{results.length} result{results.length !== 1 ? 's' : ''}</div>
        )}
        {submitted && results.length > 0 && (
          <div className="search-page-grid">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        {!submitted && (
          <div className="search-page-hint">
            <IconSearch width="40" height="40" />
            <p>Search by part number, name or brand</p>
          </div>
        )}
      </div>
    </div>
  )
}
