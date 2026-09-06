import { useRef, useState } from 'react'
import { useSeller } from '../context/useSeller'
import { IconX } from './icons'

export default function AddProduct({ category, onClose }) {
  const { createProduct } = useSeller()
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    name: '',
    brand: '',
    part_no: '',
    price: '',
    mrp: '',
    stock: '10',
    desc: '',
    category: category || '',
  })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const onFile = (e) => {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    setFiles((prev) => [
      ...prev,
      ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    ])
    e.target.value = ''
  }

  const removeFile = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.brand.trim() || !form.category) {
      setMsg('Name, brand and category are required')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('brand', form.brand.trim())
      fd.append('category', form.category)
      fd.append('part_no', form.part_no.trim())
      fd.append('price', form.price || '0')
      fd.append('mrp', form.mrp || form.price || '0')
      fd.append('stock', form.stock || '0')
      fd.append('desc', form.desc.trim())
      files.forEach(({ file: f }) => f && fd.append('images', f))
      const created = await createProduct(fd)
      setDone(true)
      setMsg(`"${created.name}" added!`)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setMsg(err.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  const categories = [
    { id: 'braking', name: 'Brakes & Rotors' },
    { id: 'suspension', name: 'Suspension & Steering' },
    { id: 'engine', name: 'Engine & Performance' },
    { id: 'electrical', name: 'Battery & Electrical' },
    { id: 'filters', name: 'Oil & Air Filters' },
    { id: 'body', name: 'Body & Exterior' },
    { id: 'interior', name: 'Interior & Comfort' },
    { id: 'fluids', name: 'Fluids & Chemicals' },
  ]

  return (
    <div className="seller-overlay" onClick={onClose}>
      <div className="seller-modal seller-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seller-modal-head">
          <h2>Add New Product{form.category ? ` — ${categories.find((c) => c.id === form.category)?.name || form.category}` : ''}</h2>
          <button className="icon-btn" onClick={onClose}><IconX width="20" height="20" /></button>
        </div>

        {done ? (
          <div className="seller-add-done">
            <div className="seller-add-check">&#10003;</div>
            <p>{msg}</p>
          </div>
        ) : (
          <form className="seller-add-form" onSubmit={handleSubmit}>
            {msg && <div className="seller-error">{msg}</div>}

            <div className="seller-add-img-row">
              <div className="seller-add-img-preview seller-add-img-multi" onClick={() => fileRef.current?.click()}>
                {files.length === 0 ? (
                  <span>+ Images</span>
                ) : (
                  files.map((item, i) => (
                    <div className="seller-add-img-cell" key={item.url}>
                      <img src={item.url} alt="Preview" />
                      <button className="seller-add-img-del" type="button" onClick={(ev) => { ev.stopPropagation(); removeFile(i) }}>&times;</button>
                    </div>
                  ))
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFile} />
            </div>

            <div className="seller-add-grid">
              <label className="seller-add-field">
                <span>Product Name *</span>
                <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. Ceramic Disc Brake Pad Set" required />
              </label>
              <label className="seller-add-field">
                <span>Brand *</span>
                <input type="text" value={form.brand} onChange={set('brand')} placeholder="e.g. Bosch" required />
              </label>
              <label className="seller-add-field">
                <span>Part Number</span>
                <input type="text" value={form.part_no} onChange={set('part_no')} placeholder="e.g. 0 986 AB1 238" />
              </label>
              <label className="seller-add-field">
                <span>Category *</span>
                <select value={form.category} onChange={set('category')} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="seller-add-field">
                <span>Price (&#8377;) *</span>
                <input type="number" min="0" value={form.price} onChange={set('price')} placeholder="1499" required />
              </label>
              <label className="seller-add-field">
                <span>MRP (&#8377;)</span>
                <input type="number" min="0" value={form.mrp} onChange={set('mrp')} placeholder="1899" />
              </label>
              <label className="seller-add-field">
                <span>Stock</span>
                <input type="number" min="0" value={form.stock} onChange={set('stock')} />
              </label>
            </div>

            <label className="seller-add-field seller-add-full">
              <span>Description</span>
              <textarea value={form.desc} onChange={set('desc')} rows="3" placeholder="Product description..." />
            </label>

            <button className="btn btn-primary seller-add-submit" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Add Product'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
