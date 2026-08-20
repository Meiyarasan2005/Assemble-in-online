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

  const state = {
    view: 'dashboard',
    token: localStorage.getItem('ms_admin_token') || '',
    username: localStorage.getItem('ms_admin_user') || '',
    products: [],
    categories: [],
    brands: [],
    vehicles: [],
    productFilter: { q: '', cat: '', brand: '', status: '', sort: 'name' },
    moveFilter: { q: '' },
  }

  /* ---------- api ---------- */

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (state.token) headers['x-admin-token'] = state.token
    let res
    try {
      res = await fetch('/api' + path, { ...opts, headers })
    } catch {
      throw new Error('Cannot reach API server (is it running on port 4000?)')
    }
    if (res.status === 401 && path !== '/auth/login') {
      state.token = ''
      localStorage.removeItem('ms_admin_token')
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
    localStorage.setItem('ms_admin_token', data.token)
    localStorage.setItem('ms_admin_user', data.username)
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
    localStorage.removeItem('ms_admin_token')
    localStorage.removeItem('ms_admin_user')
    openLogin()
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
    dashboard: ['Dashboard', 'Store health & recent activity'],
    products: ['Products', 'Catalogue, pricing and stock'],
    offers: ['Offers', 'Storefront promotions, pop-ups and banners'],
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
    const who = $('#who')
    if (who) who.textContent = state.username ? `Logged in as ${state.username}` : ''
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

  window.MS = { $, $$, ICON, state, api, loadAll, esc, money, fmtDate, catColor, stockTag, badgeTag, toast, openModal, closeModal, bindModalClose, setView, render, start, openLogin }
})()
