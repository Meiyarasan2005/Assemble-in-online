import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'http://localhost:4001'
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: root,
  stdio: 'ignore',
  env: { ...process.env, PORT: '4001' },
})

const log = (ok, msg) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

async function wait() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + '/api/store/meta')
      if (r.ok) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

let failures = 0

try {
  if (!(await wait())) throw new Error('server did not start')

  const meta = await api('/api/store/meta')
  log(meta.status === 200 && meta.data.categories.length > 0, `meta (${meta.data.categories.length} categories)`)

  const catalog = await api('/api/store/catalog?limit=5')
  log(catalog.status === 200 && catalog.data.items.length > 0, `catalog (${catalog.data.total} products)`)
  const first = catalog.data.items[0]

  const single = await api(`/api/store/catalog/${first.id}`)
  log(single.status === 200 && single.data.id === first.id, `catalog/:id (${first.id})`)

  const search = await api('/api/store/catalog?search=oil')
  log(search.status === 200 && search.data.items.length >= 0, `catalog search`)

  const email = `smoke${Date.now()}@test.in`
  const password = 'secret123'

  const unauth = await api('/api/store/checkout', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'retail',
      name: 'Smoke Tester',
      phone: '9876543210',
      paymentMethod: 'upi',
      address: { line1: 'Test 1', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      cart: [{ id: first.id, qty: 1 }],
    }),
  })
  log(unauth.status === 401, 'checkout requires account (401)')

  const registered = await api('/api/store/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Smoke Tester', email, phone: '9876543210', password }),
  })
  log(registered.status === 201 && registered.data.token, `register customer (${email})`)
  const authToken = registered.data.token

  const dup = await api('/api/store/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Smoke Tester', email, phone: '9876543210', password }),
  })
  log(dup.status === 409, 'duplicate register (409)')

  const badLogin = await api('/api/store/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'wrongpass' }),
  })
  log(badLogin.status === 401, 'login rejects wrong password (401)')

  const me = await api('/api/store/auth/me', { headers: { 'x-auth-token': authToken } })
  log(me.status === 200 && me.data.customer.email === email, 'auth/me')

  const checkout = await api('/api/store/checkout', {
    method: 'POST',
    headers: { 'x-auth-token': authToken },
    body: JSON.stringify({
      mode: 'retail',
      name: 'Smoke Tester',
      phone: '9876543210',
      paymentMethod: 'upi',
      address: { line1: 'Test 1', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      cart: [{ id: first.id, qty: 1 }],
    }),
  })
  log(checkout.status === 201 && checkout.data.order, `checkout -> ${checkout.data?.order?.id}`)
  if (checkout.status === 201) {
    const order = checkout.data.order
    const token = order.token

    log(order.paymentStatus === 'unpaid' && order.status === 'pending', 'order starts pending/unpaid')

    const paid = await api(`/api/store/payments/${order.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ token, method: 'upi' }),
    })
    log(paid.status === 200 && paid.data.paymentStatus === 'paid' && paid.data.status === 'confirmed', `payment complete -> ${paid.data.paymentRef}`)

    const byId = await api(`/api/store/orders/${order.id}?token=${token}`)
    log(byId.status === 200 && byId.data.items.length === 1, 'order detail')

    const list = await api('/api/store/orders?email=' + encodeURIComponent(email), {
      headers: { 'x-auth-token': authToken },
    })
    log(list.status === 200 && list.data.some((o) => o.id === order.id), 'orders by account')

    const cancelled = await api(`/api/store/orders/${order.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    log(cancelled.status === 200 && cancelled.data.status === 'cancelled', 'cancel order -> restock')
  }

  const bad = await api('/api/store/checkout', {
    method: 'POST',
    headers: { 'x-auth-token': authToken },
    body: JSON.stringify({ mode: 'retail', name: '', phone: '', paymentMethod: 'upi', address: {}, cart: [] }),
  })
  log(bad.status === 400, 'checkout validation (400)')

  await api('/api/store/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ token: authToken }),
  })
  const afterLogout = await api('/api/store/auth/me', { headers: { 'x-auth-token': authToken } })
  log(afterLogout.status === 401, 'logout invalidates token (401)')
} catch (e) {
  failures++
  console.error('ERROR', e.message)
}

server.kill()
process.exit(failures > 0 ? 1 : 0)
