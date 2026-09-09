export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  ''

export async function api(path, opts = {}) {
  const url = API_BASE ? `${API_BASE}/api/store${path}` : `/api/store${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
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

export async function fetchOffers() {
  return api('/offers')
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

export async function fetchOrders(phone, token) {
  return api(`/orders?phone=${encodeURIComponent(phone)}`, {
    headers: token ? { 'x-auth-token': token } : {},
  })
}

export async function fetchOrder(orderId, token) {
  return api(`/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`)
}

export async function trackOrder(orderId, phone) {
  return api('/track', { method: 'POST', body: JSON.stringify({ orderId, phone }) })
}

export async function cancelOrder(orderId, token) {
  return api(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function sellerLogin(payload) {
  return api('/seller/login', { method: 'POST', body: JSON.stringify(payload) })
}

export async function sellerLogout(token) {
  return api('/seller/logout', {
    method: 'POST',
    headers: { 'x-seller-token': token },
  })
}

export async function sellerMe(token) {
  return api('/seller/me', { headers: { 'x-seller-token': token } })
}

export async function sellerUpdateProduct(productId, payload, token) {
  return api(`/seller/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'x-seller-token': token },
  })
}

export async function sellerUploadImage(productId, file, token) {
  const form = new FormData()
  form.append('image', file)
  const url = API_BASE ? `${API_BASE}/api/store/seller/products/${encodeURIComponent(productId)}/image` : `/api/store/seller/products/${encodeURIComponent(productId)}/image`
  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: { 'x-seller-token': token },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || `Upload failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export async function sellerUploadImages(productId, files, token) {
  const form = new FormData()
  Array.from(files).forEach((f) => form.append('images', f))
  const url = API_BASE ? `${API_BASE}/api/store/seller/products/${encodeURIComponent(productId)}/images` : `/api/store/seller/products/${encodeURIComponent(productId)}/images`
  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: { 'x-seller-token': token },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || `Upload failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export async function sellerCreateProduct(formData, token) {
  const url = API_BASE ? `${API_BASE}/api/store/seller/products` : '/api/store/seller/products'
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: { 'x-seller-token': token },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || `Create failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export async function fetchBanner() {
  return api('/banner')
}

export async function updateBanner(payload, token) {
  return api('/banner', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: token ? { 'x-seller-token': token } : {},
  })
}

export async function sendOtp(phone) {
  return api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) })
}

export async function verifyOtp(phone, otp) {
  return api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) })
}
