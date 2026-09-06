import { randomBytes } from 'node:crypto'
import { resolveMx } from 'node:dns'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { db, now } from './db.js'
import { hashPassword, verifyPassword } from './auth.js'

const TOKEN_BYTES = 24
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com','throwaway.email','guerrillamail.com','mailinator.com','yopmail.com',
  'temp-mail.org','fakeinbox.com','sharklasers.com','guerrillamailblock.com',
  'grr.la','dispostable.com','10minutemail.com','trashmail.com','maildrop.cc',
  'discard.email','discardmail.com','mailcatch.com','tempail.com','tempr.email',
  'tmpmail.net','mohmal.com','burnermail.io','harakirimail.com','getnada.com',
  'emailondeck.com','spamgourmet.com','mytemp.email','tmpmail.org','mailsac.com',
  'temptrack.com','mailnesia.com','fake-mail.com','tempinbox.com','discardmail.de',
  'mailexpire.com','jetable.org','temp-mail.io','minutemail.com','tmpmail.fr',
  'throwam.com','tmail.ws','emailfake.com','mailnull.com','temp-mail.com',
  'crazymailing.com','zehnminutenmail.de','10minutemail.co.za','meltmail.com',
  'tempomail.fr','filzmail.com','tempmailer.com','obobbo.com','mailmoat.com',
])

/* Reserved, non-deliverable hostnames/TLDs (RFC 2606 + loopback). */
const RESERVED_DOMAINS = new Set(['localhost', 'local', 'test', 'invalid', 'example', 'example.com', 'example.net', 'example.org', 'example.edu', 'example.invalid'])
const RESERVED_SUFFIXES = ['.local', '.test', '.invalid', '.example', '.localhost', '.internal', '.home', '.lan']

/* Verify an email is not a throwaway/fake address. Returns
   { ok: true } for real deliverable domains, otherwise
   { ok: false, reason: 'disposable' | 'no-mx' }. */
export async function verifyEmailDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return { ok: false, reason: 'no-mx' }
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: 'disposable' }
  if (isIP(domain) || RESERVED_DOMAINS.has(domain) || RESERVED_SUFFIXES.some((s) => domain.endsWith(s))) {
    return { ok: false, reason: 'no-mx' }
  }
  try {
    const mxs = await resolveMx(domain)
    if (mxs.length > 0) return { ok: true }
  } catch {
    /* fall through to A/AAAA record check */
  }
  try {
    await lookup(domain)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'no-mx' }
  }
}

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

export async function registerCustomer({ name, email, phone, password }) {
  const cleanName = String(name ?? '').trim()
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const cleanPhone = normalizePhone(phone)
  const pass = String(password ?? '')
  if (cleanName.length < 2) throw Object.assign(new Error('Full name is required'), { status: 400 })
  if (!EMAIL_RE.test(cleanEmail)) throw Object.assign(new Error('Enter a valid email'), { status: 400 })
  if (cleanPhone.length !== 10) throw Object.assign(new Error('Enter a valid 10-digit mobile number'), { status: 400 })
  if (pass.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 })

  const domainCheck = await verifyEmailDomain(cleanEmail)
  if (!domainCheck.ok) {
    const msg =
      domainCheck.reason === 'disposable'
        ? 'Disposable email addresses are not allowed — use your real email'
        : 'We could not verify this email domain — please use a real email address'
    throw Object.assign(new Error(msg), { status: 400 })
  }

  const exists = await db.customers.findOne({ _id: cleanEmail })
  if (exists && exists.password_hash) {
    throw Object.assign(new Error('An account already exists with this email — sign in instead'), { status: 409 })
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
      throw Object.assign(new Error('An account already exists with this email — sign in instead'), { status: 409 })
    }
    throw err
  }
  return { id: cleanEmail, email: cleanEmail, name: cleanName, phone: cleanPhone }
}

export async function loginCustomer({ email, password }) {
  const cleanEmail = String(email ?? '').trim().toLowerCase()
  const row = await db.customers.findOne({ _id: cleanEmail })
  if (!row) {
    throw Object.assign(new Error('No account found for this email'), { status: 401 })
  }
  if (!row.password_hash) {
    throw Object.assign(
      new Error('This account was created during checkout. Please sign up with this email to set a password, or place a new order.'),
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
  const cleanName = String(name ?? '').trim()
  const cleanPhone = normalizePhone(phone)
  if (cleanName.length < 2) throw Object.assign(new Error('Full name is required'), { status: 400 })
  if (cleanPhone.length !== 10) throw Object.assign(new Error('Enter a valid 10-digit mobile number'), { status: 400 })
  await db.customers.updateOne({ _id: email }, { $set: { name: cleanName, phone: cleanPhone, updated_at: now() } })
  const row = await db.customers.findOne({ _id: email })
  return customerPublic(row)
}

export async function changeCustomerPassword(email, { current, next }) {
  const row = await db.customers.findOne({ _id: email })
  if (!row || !row.password_hash) {
    throw Object.assign(new Error('No account found for this email'), { status: 401 })
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
  if (address.line1.length < 3) throw Object.assign(new Error('Address line is required'), { status: 400 })
  if (address.city.length < 2) throw Object.assign(new Error('City is required'), { status: 400 })
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
  const merged = { ...addresses[index], ...body, id: addresses[index].id }
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
