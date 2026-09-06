import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/useStore'
import {
  addAddress,
  changePassword,
  deleteAddress,
  fetchAddresses,
  updateAddress,
  updateProfile,
} from '../lib/api'
import {
  IconArrowRight,
  IconBox,
  IconCheck,
  IconLock,
  IconMapPin,
  IconPackage,
  IconPlus,
  IconTrash,
  IconUser,
} from '../components/icons'

const EMPTY_ADDR = { label: '', line1: '', line2: '', location: '', city: '', state: '', pincode: '' }

function normPhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

export default function Profile() {
  const { customer, token, isAuthed, authReady, refreshCustomer } = useStore()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState({ kind: '', text: '' })
  const [pwBusy, setPwBusy] = useState(false)

  const [addresses, setAddresses] = useState(null)
  const [addrErr, setAddrErr] = useState('')
  const [addrNote, setAddrNote] = useState('')
  const [editing, setEditing] = useState(null) // 'new' | address object
  const [form, setForm] = useState(EMPTY_ADDR)
  const [savingAddr, setSavingAddr] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
    }
  }, [customer])

  const loadAddresses = useCallback(async () => {
    try {
      setAddresses(await fetchAddresses(token))
    } catch {
      setAddresses([])
    }
  }, [token])

  useEffect(() => {
    if (isAuthed && authReady) loadAddresses()
  }, [isAuthed, authReady, loadAddresses])

  if (authReady && !isAuthed) {
    return (
      <div className="container empty-state card" style={{ marginTop: 40 }}>
        <h3>Please log in</h3>
        <p>Log in to your account to manage your profile, saved addresses and tracking.</p>
        <Link to="/account?next=/profile" className="btn btn-primary">
          Log in / Create account <IconArrowRight width="16" height="16" />
        </Link>
      </div>
    )
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaveErr('')
    const el = e.currentTarget
    const get = (n) => {
      const f = el.elements.namedItem(n)
      return f ? String(f.value ?? '') : ''
    }
    const pName = get('pf-name') || name
    const pPhone = normPhone(get('pf-phone')) || normPhone(phone)
    if (pName.trim().length < 2) return setSaveErr('Full name is required')
    if (pPhone.length !== 10) return setSaveErr('Enter a valid 10-digit mobile number')
    setName(pName)
    setPhone(pPhone)
    try {
      await updateProfile({ name: pName.trim(), phone: pPhone.trim() }, token)
      await refreshCustomer()
      setSaved(true)
      setTimeout(() => setSaved(false), 2600)
    } catch (err) {
      setSaveErr(err.message || 'Could not save changes')
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setPwMsg({ kind: '', text: '' })
    if (pw.next.length < 6) return setPwMsg({ kind: 'err', text: 'New password must be at least 6 characters' })
    if (pw.next !== pw.confirm) return setPwMsg({ kind: 'err', text: 'Passwords do not match' })
    setPwBusy(true)
    try {
      await changePassword({ current: pw.current, next: pw.next }, token)
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ kind: 'ok', text: 'Password updated' })
    } catch (err) {
      setPwMsg({ kind: 'err', text: err.message || 'Could not change password' })
    } finally {
      setPwBusy(false)
    }
  }

  const startEdit = (addr) => {
    setEditing(addr || 'new')
    setForm(addr ? { ...addr } : EMPTY_ADDR)
    setAddrErr('')
    setAddrNote('')
  }

  const submitAddress = async (e) => {
    e.preventDefault()
    setAddrErr('')
    setAddrNote('')
    if (form.line1.trim().length < 3) return setAddrErr('Address line is required')
    if (form.location.trim().length < 2) return setAddrErr('Location / Area is required')
    if (form.city.trim().length < 2) return setAddrErr('City is required')
    if (form.state.trim().length < 2) return setAddrErr('State is required')
    if (!/^\d{6}$/.test(form.pincode.trim())) return setAddrErr('Enter a valid 6-digit PIN code')
    setSavingAddr(true)
    try {
      if (editing === 'new') await addAddress(form, token)
      else await updateAddress(editing.id, form, token)
      setEditing(null)
      setAddrNote('Address saved')
      await loadAddresses()
    } catch (err) {
      setAddrErr(err.message || 'Could not save address')
    } finally {
      setSavingAddr(false)
    }
  }

  const removeAddress = async (id) => {
    if (!window.confirm('Remove this saved address?')) return
    try {
      await deleteAddress(id, token)
      setAddrNote('Address removed')
      await loadAddresses()
    } catch (err) {
      setAddrErr(err.message || 'Could not remove address')
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <IconArrowRight width="13" height="13" />
        <Link to="/account">My account</Link>
        <IconArrowRight width="13" height="13" />
        <span>Profile</span>
      </nav>

      <div className="profile-head">
        <div>
          <h1>Your profile</h1>
          <p>Manage your details, password and saved delivery addresses.</p>
        </div>
        <Link to="/orders" className="btn btn-ghost">
          <IconBox width="16" height="16" /> My orders
        </Link>
      </div>

      <div className="profile-grid">
        <div className="profile-col">
          <form className="card profile-card" onSubmit={saveProfile}>
            <h2>Account details</h2>
            <label className="co-field">
              <span>Email address</span>
              <div className="co-email-readonly">
                <IconCheck width="15" height="15" />
                <span>{customer?.email}</span>
              </div>
            </label>
            <label className="co-field">
              <span>Full name</span>
              <input name="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="co-field">
              <span>Mobile number</span>
              <input name="pf-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </label>
            {saveErr && <p className="co-error">{saveErr}</p>}
            <button className="btn btn-primary btn-block" type="submit">
              {saved ? (<><IconCheck width="15" height="15" /> Saved</>) : 'Save changes'}
            </button>
          </form>

          <form className="card profile-card" onSubmit={submitPassword}>
            <h2>Change password</h2>
            <label className="co-field">
              <span>Current password</span>
              <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            </label>
            <label className="co-field">
              <span>New password</span>
              <input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            </label>
            <label className="co-field">
              <span>Confirm new password</span>
              <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            </label>
            {pwMsg.text && (
              <p className={pwMsg.kind === 'ok' ? 'profile-ok' : 'co-error'}>{pwMsg.text}</p>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={pwBusy}>
              <IconLock width="15" height="15" /> {pwBusy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>

        <div className="profile-col">
          <div className="card profile-card">
            <div className="profile-card-head">
              <h2>Saved addresses</h2>
              {!editing && (
                <button className="btn btn-sm btn-primary" onClick={() => startEdit(null)}>
                  <IconPlus width="14" height="14" /> Add
                </button>
              )}
            </div>

            {addresses === null ? (
              <p className="profile-muted">Loading addresses…</p>
            ) : addresses.length === 0 && !editing ? (
              <div className="profile-empty">
                <IconMapPin width="30" height="30" />
                <p>No saved addresses yet. Add one to check out faster.</p>
              </div>
            ) : (
              addresses.map((a) => (                <div key={a.id} className="addr-row">
                  <div className="addr-ic"><IconMapPin width="16" height="16" /></div>
                  <div className="addr-info">
                    <strong>{a.label}</strong>
                    <span>{a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.location ? `, ${a.location}` : ''}</span>
                    <span>{a.city}, {a.state} — {a.pincode}</span>
                  </div>
                  <div className="addr-actions">
                    <button className="btn btn-sm ghost" onClick={() => startEdit(a)}>Edit</button>
                    <button className="btn btn-sm danger ghost" onClick={() => removeAddress(a.id)}>
                      <IconTrash width="14" height="14" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {addrNote && <p className="profile-ok">{addrNote}</p>}
            {editing && (
              <form className="addr-form" onSubmit={submitAddress}>
                <h3>{editing === 'new' ? 'Add an address' : 'Edit address'}</h3>
                <label className="co-field">
                  <span>Label</span>
                  <input className="input" placeholder="e.g. Home, Workshop" value={form.label} onChange={set('label')} />
                </label>
                <label className="co-field">
                  <span>Address line 1</span>
                  <input className="input" placeholder="House / shop no, street" value={form.line1} onChange={set('line1')} />
                </label>
                <label className="co-field">
                  <span>Address line 2 (optional)</span>
                  <input className="input" placeholder="Landmark, area" value={form.line2} onChange={set('line2')} />
                </label>
                <label className="co-field">
                  <span>Location / Area</span>
                  <input className="input" placeholder="E.g. Gandhipuram, Peelamedu, RS Puram" value={form.location} onChange={set('location')} />
                </label>
                <div className="co-grid">
                  <label className="co-field">
                    <span>City</span>
                    <input className="input" value={form.city} onChange={set('city')} />
                  </label>
                  <label className="co-field">
                    <span>State</span>
                    <input className="input" value={form.state} onChange={set('state')} />
                  </label>
                </div>
                <label className="co-field">
                  <span>PIN code</span>
                  <input className="input" inputMode="numeric" placeholder="411001" value={form.pincode} onChange={set('pincode')} />
                </label>
                {addrErr && <p className="co-error">{addrErr}</p>}
                <div className="addr-form-actions">
                  <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={savingAddr}>
                    {savingAddr ? 'Saving…' : 'Save address'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card profile-card profile-links">
            <Link to="/orders"><IconPackage width="16" height="16" /> Track my orders <IconArrowRight width="14" height="14" /></Link>
            <Link to="/account"><IconUser width="16" height="16" /> My account <IconArrowRight width="14" height="14" /></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
