export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:4000'

export async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}/api/store${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function fetchMeta() {
  return api('/meta')
}

export async function fetchCatalog(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v != null) qs.set(k, v)
  })
  return api(`/catalog?${qs.toString()}`)
}

export async function fetchProduct(id) {
  return api(`/catalog/${encodeURIComponent(id)}`)
}

export async function registerCustomer(payload) {
  return api('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
}

export async function loginCustomer(payload) {
  return api('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
}

export async function logoutCustomer(token) {
  return api('/auth/logout', { method: 'POST', body: JSON.stringify({ token }) })
}

export async function fetchMe(token) {
  return api('/auth/me', { headers: { 'x-auth-token': token } })
}

export async function updateProfile(payload, token) {
  return api('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function changePassword(payload, token) {
  return api('/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function fetchAddresses(token) {
  return api('/addresses', { headers: token ? { 'x-auth-token': token } : {} })
}

export async function addAddress(payload, token) {
  return api('/addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function updateAddress(id, payload, token) {
  return api(`/addresses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function deleteAddress(id, token) {
  return api(`/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function checkout(payload, token) {
  return api('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function completePayment(orderId, token, method) {
  return api(`/payments/${encodeURIComponent(orderId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ token, method }),
  })
}

export async function verifyPayment(orderId, token, razorpayPayload) {
  return api(`/payments/razorpay/verify`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, token, ...razorpayPayload }),
  })
}

export async function retryPayment(orderId, token) {
  return api(`/payments/${encodeURIComponent(orderId)}/retry`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function failPayment(orderId, token) {
  return api(`/payments/${encodeURIComponent(orderId)}/fail`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function fetchOrders(email, token) {
  return api(`/orders?email=${encodeURIComponent(email)}`, {
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function fetchOrder(orderId, token) {
  return api(`/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`)
}

export async function cancelOrder(orderId, token) {
  return api(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
