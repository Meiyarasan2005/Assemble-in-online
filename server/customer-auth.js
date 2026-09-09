import { randomBytes } from 'node:crypto'
import { db, now } from './db.js'
import { hashPassword, verifyPassword } from './auth.js'
import { pinToStateHint } from './pin-hints.js'

const TOKEN_BYTES = 24
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function createCustomerSession(customerEmail) {
  const token = randomBytes(TOKEN_BYTES).toString('base64url')
  await db.customer_sessions.insertOne({ _id: token, customer_email: customerEmail, created_at: now() })
  return token
}

export async function destroyCustomerSession(token) {
  if (token) await db.customer_sessions.deleteOne({ _id: token })
}

export async function customerFromToken(token) {
  if (!token) return null
  const session = await db.customer_sessions.findOne({ _id: token })
  if (!session) return null
  const row = await db.customers.findOne({ _id: session.customer_email })
  if (!row) return null
  return { id: row._id, email: row._id, name: row.name, phone: row.phone, createdAt: row.created_at }
}

function normalizePhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

/* Map a 10-digit mobile to the internal account key. The account is
   stored under a synthetic (never used for mail) address so that
   orders, sessions and saved addresses keep working unchanged. */
export function emailForPhone(raw) {
  const clean = normalizePhone(raw)
  return `${clean}@cust.assemble.online`
}

export async function registerCustomer({ name, phone, password, email: maybeEmail }) {
  const cleanName = String(name ?? '').trim()
  const cleanPhone = normalizePhone(phone)
  const pass = String(password ?? '')
  if (cleanName.length < 2) throw Object.assign(new Error('Full name is required'), { status: 400 })
  if (cleanPhone.length !== 10) throw Object.assign(new Error('Enter a valid 10-digit mobile number'), { status: 400 })
  if (pass.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 })

  const cleanEmail = maybeEmail ? String(maybeEmail).trim().toLowerCase() : emailForPhone(cleanPhone)
  if (!EMAIL_RE.test(cleanEmail)) {
    throw Object.assign(new Error('Enter a valid email'), { status: 400 })
  }

  const exists = await db.customers.findOne({ _id: cleanEmail })
  if (exists && exists.password_hash) {
    throw Object.assign(new Error('An account already exists for this mobile number — sign in instead'), { status: 409 })
  }

  const { salt, hash } = hashPassword(pass)

  if (exists && !exists.password_hash) {
    await db.customers.updateOne(
      { _id: cleanEmail },
      { $set: { name: cleanName, phone: cleanPhone, password_hash: hash, salt, updated_at: now() } },
    )
    return { id: cleanEmail, email: cleanEmail, name: cleanName, phone: cleanPhone }
  }

  try {
    await db.customers.insertOne({
      _id: cleanEmail,
      email: cleanEmail,
      phone: cleanPhone,
      name: cleanName,
      password_hash: hash,
      salt,
      created_at: now(),
    })
  } catch (err) {
    if (err?.code === 11000 || /duplicate key/i.test(String(err?.message || ''))) {
      throw Object.assign(new Error('An account already exists for this mobile number — sign in instead'), { status: 409 })
    }
    throw err
  }
  return { id: cleanEmail, email: cleanEmail, name: cleanName, phone: cleanPhone }
}

export async function loginCustomer({ email, phone, password }) {
  const rawEmail = String(email ?? '').trim().toLowerCase()
  const cleanEmail = rawEmail ? rawEmail : emailForPhone(phone)
  const row = await db.customers.findOne({ _id: cleanEmail })
  if (!row) {
    throw Object.assign(new Error('No account found for this mobile number'), { status: 401 })
  }
  if (!row.password_hash) {
    throw Object.assign(
      new Error('This account was created during checkout. Please sign up with this mobile number to set a password, or place a new order.'),
      { status: 401, code: 'NO_PASSWORD' },
    )
  }
  if (!verifyPassword(String(password ?? ''), row.salt, row.password_hash)) {
    throw Object.assign(new Error('Incorrect password'), { status: 401 })
  }
  return customerPublic(row)
}

function customerPublic(row) {
  return {
    id: row._id,
    email: row._id,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
  }
}

export async function updateCustomerProfile(email, { name, phone }) {
  const set = {}
  if (String(name ?? '').trim() !== '') {
    const cleanName = String(name).trim()
    if (cleanName.length < 2) throw Object.assign(new Error('Full name is required'), { status: 400 })
    set.name = cleanName
  }
  if (String(phone ?? '').replace(/\D/g, '') !== '') {
    const cleanPhone = normalizePhone(phone)
    if (cleanPhone.length !== 10) throw Object.assign(new Error('Enter a valid 10-digit mobile number'), { status: 400 })
    set.phone = cleanPhone
  }
  const row = await db.customers.findOne({ _id: email })
  if (Object.keys(set).length) {
    await db.customers.updateOne({ _id: email }, { $set: { ...set, updated_at: now() } })
    const updated = await db.customers.findOne({ _id: email })
    return customerPublic(updated)
  }
  return customerPublic(row)
}

export async function changeCustomerPassword(email, { current, next }) {
  const row = await db.customers.findOne({ _id: email })
  if (!row || !row.password_hash) {
    throw Object.assign(new Error('No account found for this mobile number'), { status: 401 })
  }
  if (!verifyPassword(String(current ?? ''), row.salt, row.password_hash)) {
    throw Object.assign(new Error('Current password is incorrect'), { status: 401 })
  }
  if (String(next ?? '').length < 6) {
    throw Object.assign(new Error('New password must be at least 6 characters'), { status: 400 })
  }
  const { salt, hash } = hashPassword(String(next))
  await db.customers.updateOne({ _id: email }, { $set: { salt, password_hash: hash, updated_at: now() } })
  return { ok: true }
}

export async function customerAddresses(email) {
  const row = await db.customers.findOne({ _id: email }, { projection: { addresses: 1 } })
  return Array.isArray(row?.addresses) ? row.addresses : []
}

function normalizeAddress(body, index) {
  const clean = (s) => String(s ?? '').trim()
  const label = clean(body.label) || `Address ${(index ?? 0) + 1}`
  const address = {
    id: clean(body.id) || String(Date.now()),
    label,
    line1: clean(body.line1),
    line2: clean(body.line2),
    location: clean(body.location),
    city: clean(body.city),
    state: clean(body.state),
    pincode: clean(body.pincode),
  }
  if (address.line1.length < 3) {
    /* A filled-in area/location or landmark is a valid street-level line. */
    address.line1 = address.location.length >= 3 ? address.location : address.line2.length >= 3 ? address.line2 : ''
    if (address.line1.length < 3) {
      throw Object.assign(new Error('Address line is required'), { status: 400 })
    }
  }
  if (address.city.length < 2) throw Object.assign(new Error('City is required'), { status: 400 })
  if (!address.state) address.state = pinToStateHint(address.pincode)
  if (address.state.length < 2) throw Object.assign(new Error('State is required'), { status: 400 })
  if (!/^\d{6}$/.test(address.pincode)) throw Object.assign(new Error('Enter a valid 6-digit PIN code'), { status: 400 })
  return address
}

export async function addCustomerAddress(email, body) {
  const addresses = await customerAddresses(email)
  const address = normalizeAddress(body, addresses.length)
  addresses.push(address)
  await db.customers.updateOne({ _id: email }, { $set: { addresses, updated_at: now() } })
  return address
}

export async function updateCustomerAddress(email, id, body) {
  const addresses = await customerAddresses(email)
  const index = addresses.findIndex((a) => String(a.id) === String(id))
  if (index === -1) throw Object.assign(new Error('Address not found'), { status: 404 })
  const merged = { ...addresses[index], id: addresses[index].id }
  for (const k of ['label', 'line1', 'line2', 'location', 'city', 'state', 'pincode']) {
    const v = String(body[k] ?? '')
    if (v.trim() !== '') merged[k] = v.trim()
  }
  const address = normalizeAddress(merged, index)
  addresses[index] = address
  await db.customers.updateOne({ _id: email }, { $set: { addresses, updated_at: now() } })
  return address
}

export async function deleteCustomerAddress(email, id) {
  const addresses = await customerAddresses(email)
  const next = addresses.filter((a) => String(a.id) !== String(id))
  if (next.length === addresses.length) throw Object.assign(new Error('Address not found'), { status: 404 })
  await db.customers.updateOne({ _id: email }, { $set: { addresses: next, updated_at: now() } })
  return { ok: true }
}
