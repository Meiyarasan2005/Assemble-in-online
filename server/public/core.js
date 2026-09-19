/* Mei Spare · Inventory Admin — core */
;(function () {
  'use strict'

  const $ = (s, root = document) => root.querySelector(s)
  const $$ = (s, root = document) => [...root.querySelectorAll(s)]

  const ICON = {
    edit:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3l4 4L8 20l-5 1 1-5L17 3Z"/></svg>',
    trash:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    stock:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="M3 7l9 5 9-5M12 22V12"/></svg>',
  }

  const LIVE_BASE = 'https://assembleonline.in/api'

  // One admin tool, two databases: local test data vs the live website.
  // Uploads/edits go to whichever target is selected.
  function tokenKey(t) {
    return (t || state.apiTarget) === 'live' ? 'ms_admin_token_live' : 'ms_admin_token_local'
  }
  function userKey(t) {
    return (t || state.apiTarget) === 'live' ? 'ms_admin_user_live' : 'ms_admin_user_local'
  }

  const state = {
    view: 'dashboard',
    apiTarget: localStorage.getItem('ms_api_target') || 'local',
    token: '',
    username: '',
    products: [],
    categories: [],
    brands: [],
    vehicles: [],
    productFilter: { q: '', cat: '', brand: '', status: '', sort: 'name' },
    moveFilter: { q: '' },
  }
  // Migrate the old single token (it belonged to the local server).
  if (localStorage.getItem('ms_admin_token') && !localStorage.getItem(tokenKey('local'))) {
    localStorage.setItem(tokenKey('local'), localStorage.getItem('ms_admin_token'))
    localStorage.setItem(userKey('local'), localStorage.getItem('ms_admin_user') || '')
    localStorage.removeItem('ms_admin_token')
    localStorage.removeItem('ms_admin_user')
  }
  state.token = localStorage.getItem(tokenKey()) || ''
  state.username = localStorage.getItem(userKey()) || ''

  function apiBase() {
    return state.apiTarget === 'live' ? LIVE_BASE : '/api'
  }

  /* ---------- api ---------- */

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (state.token) headers['x-admin-token'] = state.token
    let res
    try {
      res = await fetch(apiBase() + path, { ...opts, headers })
    } catch {
      throw new Error(
        state.apiTarget === 'live' ? 'Cannot reach the live website API — check your connection.' : 'Cannot reach API server (is it running on port 4000?)',
      )
    }
    if (res.status === 401 && path !== '/auth/login') {
      state.token = ''
      localStorage.removeItem(tokenKey())
      openLogin()
      throw new Error('AUTH_REQUIRED')
    }
    if (!res.ok) {
      let msg = res.statusText
      try {
        const data = await res.json()
        if (data.error) msg = data.error
      } catch {}
      throw new Error(msg)
    }
    return res.json()
  }

  async function loadAll() {
    const [cats, vehs, brands] = await Promise.all([
      api('/categories'),
      api('/vehicles'),
      api('/brands'),
    ])
    state.categories = cats
    state.vehicles = vehs
    state.brands = brands
  }

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]))
  }

  const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
  function money(n) {
    return '₹' + inr.format(Math.round(Number(n) || 0))
  }
  function fmtDate(s) {
    if (!s) return ''
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
    return isNaN(d)
      ? s
      : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function catColor(id) {
    const colors = ['#ff6a00', '#35d0f2', '#ff8b8b', '#b49bff', '#2ecc8f', '#ffd27a', '#ff9ed2', '#7ec3ff']
    let h = 0
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return colors[h % colors.length]
  }

  function stockTag(n) {
    if (n <= 0) return '<span class="tag stock-out">Out</span>'
    if (n < 10) return '<span class="tag stock-low">Low</span>'
    return '<span class="tag stock-in">In stock</span>'
  }

  function badgeTag(b) {
    const map = { new: 'New', top: 'Best', low: 'Low', sale: 'Sale' }
    return map[b] ? `<span class="tag ${b}">${map[b]}</span>` : ''
  }

  function toast(msg, kind = 'ok') {
    const t = document.createElement('div')
    t.className = `toast ${kind}`
    t.textContent = msg
    $('#toasts').appendChild(t)
    setTimeout(() => t.remove(), 2600)
  }

  /* ---------- modal ---------- */

  function openModal(html, opts = {}) {
    const m = $('#modal')
    m.className = `modal ${opts.wide ? 'wide' : ''} ${opts.small ? 'small' : ''}`
    m.innerHTML = html
    $('#modal-bg').classList.add('open')
    const first = $('input:not([type=hidden]), select, textarea, [data-auto-focus]', m)
    if (first) setTimeout(() => first.focus(), 60)
    return m
  }

  function closeModal() {
    $('#modal-bg').classList.remove('open')
    state.edits = null
    $('#modal').innerHTML = ''
  }

  function bindModalClose() {
    $$('#modal [data-close]').forEach((b) => b.addEventListener('click', closeModal))
  }

  $('#modal-bg').addEventListener('mousedown', (e) => {
    if (e.target.id === 'modal-bg') closeModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#modal-bg').classList.contains('open')) closeModal()
  })

  /* ---------- login ---------- */

  let loginMode = 'login' // 'login' | 'register'

  async function openLogin() {
    $('#login-bg').classList.add('open')
    setLoginMode('login')
    try {
      const s = await api('/auth/status')
      if (!s.hasUsers) {
        setLoginMode('register')
        $('#login-hint').textContent = 'No account exists yet — create the first admin account.'
      }
    } catch {}
    setTimeout(() => $('#login-user').focus(), 60)
  }
  function closeLogin() {
    $('#login-bg').classList.remove('open')
  }

  function setLoginMode(mode) {
    loginMode = mode
    const register = mode === 'register'
    $('#login-title').textContent = register ? 'Create admin account' : 'Admin login'
    $('#login-confirm-wrap').style.display = register ? '' : 'none'
    $('#login-toggle').textContent = register ? '← I have an account' : 'No account? Create one'
    $('#login-go').textContent = register ? 'Create account' : 'Login'
    if (!register) $('#login-hint').textContent = ''
  }

  async function submitLogin() {
    const user = $('#login-user').value.trim()
    const pass = $('#login-pass').value
    const pass2 = $('#login-pass2').value
    if (!user || !pass) return
    if (loginMode === 'register') {
      if (pass !== pass2) {
        $('#login-hint').textContent = 'Passwords do not match.'
        return
      }
      try {
        await api('/auth/register', { method: 'POST', body: JSON.stringify({ username: user, password: pass }) })
      } catch (e) {
        $('#login-hint').textContent = e.message
        return
      }
    }
    let data
    try {
      data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: user, password: pass }) })
    } catch (e) {
      $('#login-hint').textContent = e.message
      return
    }
    state.token = data.token
    state.username = data.username
    localStorage.setItem(tokenKey(), data.token)
    localStorage.setItem(userKey(), data.username)
    $('#login-user').value = ''
    $('#login-pass').value = ''
    $('#login-pass2').value = ''
    $('#login-hint').textContent = ''
    closeLogin()
    try {
      await boot()
      toast('Welcome, ' + data.username)
    } catch (e) {
      if (e.message !== 'AUTH_REQUIRED') toast(e.message, 'err')
    }
  }

  function logout() {
    if (state.token) {
      api('/auth/logout', { method: 'POST' }).catch(() => {})
    }
    state.token = ''
    state.username = ''
    localStorage.removeItem(tokenKey())
    localStorage.removeItem(userKey())
    openLogin()
  }

  async function setApiTarget(t) {
    if (t !== 'live' && t !== 'local') return
    if (state.apiTarget === t) return
    state.apiTarget = t
    localStorage.setItem('ms_api_target', t)
    state.token = localStorage.getItem(tokenKey()) || ''
    state.username = localStorage.getItem(userKey()) || ''
    paintApiTarget()
    try {
      await boot()
    } catch (e) {
      if (e.message !== 'AUTH_REQUIRED') toast(e.message, 'err')
    }
    render()
    toast(t === 'live' ? 'Connected to the LIVE website database' : 'Connected to the LOCAL test database')
  }

  function paintApiTarget() {
    document.querySelectorAll('[data-apitarget]').forEach((b) =>
      b.classList.toggle('on', b.dataset.apitarget === state.apiTarget),
    )
    const badge = $('#api-target-badge')
    if (badge) {
      const live = state.apiTarget === 'live'
      badge.textContent = live ? '● LIVE website' : '● Local test'
      badge.classList.toggle('live', live)
    }
    const who = $('#who')
    if (who) who.textContent = state.username ? `${state.username} · ${state.apiTarget === 'live' ? 'live site' : 'local'}` : ''
    const avatar = $('#top-user')
    if (avatar) avatar.textContent = (state.username || 'A').slice(0, 1).toUpperCase()
  }

  $('#login-go').addEventListener('click', submitLogin)
  $('#login-toggle').addEventListener('click', () => setLoginMode(loginMode === 'login' ? 'register' : 'login'))
  $('#login-close').addEventListener('click', closeLogin)
  ;['login-user', 'login-pass', 'login-pass2'].forEach((id) =>
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitLogin()
    })
  )

  /* ---------- nav ---------- */

  const TITLES = {
    dashboard: ['Home', 'Store health & recent activity'],
    products: ['Products', 'Catalogue, pricing and stock'],
    offers: ['Offers', 'Storefront promotions, pop-ups and banners'],
    banners: ['Banners', 'Homepage hero slides — upload an image and it goes live'],
    movements: ['Stock log', 'Every inbound / outbound movement'],
    orders: ['Orders', 'Customer orders, payments and fulfilment'],
    customers: ['Customers', 'Storefront accounts and spending'],
    categories: ['Categories', 'Organise the catalogue'],
    vehicles: ['Vehicles', 'Fitment database'],
    users: ['Users', 'Admin accounts'],
  }

  $('#nav').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]')
    if (!btn) return
    setView(btn.dataset.view)
  })

  function setView(view) {
    state.view = view
    $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.view === view))
    $$('.wrap > section').forEach((s) => s.classList.add('hidden'))
    $('#view-' + view).classList.remove('hidden')
    const [title, sub] = TITLES[view]
    $('#view-title').textContent = title
    $('#view-sub').textContent = sub
    $('#btn-new').style.display = view === 'products' ? '' : 'none'
    render()
  }

  async function render() {
    try {
      const v = state.view
      if (v === 'dashboard') await window.MS.renderDashboard()
      if (v === 'products') await window.MS.renderProducts()
      if (v === 'offers') await window.MS.renderOffers()
      if (v === 'banners') await window.MS.renderBanners()
      if (v === 'movements') await window.MS.renderMovements()
      if (v === 'orders') await window.MS.renderOrders()
      if (v === 'customers') await window.MS.renderCustomers()
      if (v === 'categories') window.MS.renderCategories()
      if (v === 'vehicles') window.MS.renderVehicles()
      if (v === 'users') window.MS.renderUsers()
    } catch (e) {
      if (e.message !== 'AUTH_REQUIRED') toast(e.message, 'err')
    }
  }

  /* ---------- boot ---------- */

  async function boot() {
    await loadAll()
    paintApiTarget()
    setView(state.view)
    const conn = $('#conn')
    conn.innerHTML = '<span class="dot ok"></span>API connected'
  }

  async function start() {
    try {
      await boot()
    } catch (e) {
      if (e.message !== 'AUTH_REQUIRED') {
        $('#conn').innerHTML = '<span class="dot bad"></span>API offline'
        toast(e.message, 'err')
      }
    }
  }

  $('#logout').addEventListener('click', logout)

  // Shopify-style top search: jump to the product list filtered by the query.
  $('#top-search')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    state.productFilter.q = e.target.value.trim()
    setView('products')
  })

  window.MS = { $, $$, ICON, state, api, apiBase, setApiTarget, paintApiTarget, loadAll, esc, money, fmtDate, catColor, stockTag, badgeTag, toast, openModal, closeModal, bindModalClose, setView, render, start, openLogin }

  document.querySelectorAll('[data-apitarget]').forEach((b) =>
    b.addEventListener('click', () => setApiTarget(b.dataset.apitarget)),
  )
})()
