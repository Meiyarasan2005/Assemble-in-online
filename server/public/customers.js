/* Mei Spare · Admin — customers */
;(function () {
  'use strict'

  const { $, $$, state, api, esc, fmtDate, money, toast, openModal, bindModalClose } = window.MS

  state.customerFilter = { q: '' }
  state.customers = []

  const STATUS_TAG = {
    pending: 'stock-low',
    confirmed: 'top',
    shipped: 'new',
    delivered: 'stock-in',
    cancelled: 'sale',
  }

  const STATUS_TEXT = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  async function renderCustomers() {
    const el = $('#view-customers')
    if (!el) return

    el.innerHTML = `
      <div class="toolbar">
        <input id="c-q" class="input grow" type="search" placeholder="Search name, email or phone…" value="${esc(state.customerFilter.q)}" />
        <button class="btn" id="c-refresh">↺ Refresh</button>
      </div>
      <div class="status-line" id="c-count"></div>
      <div class="panel">
        <div class="tbl-wrap">
          <table class="tbl" id="c-tbl"></table>
        </div>
      </div>`

    $('#c-q', el).addEventListener('input', (e) => {
      state.customerFilter.q = e.target.value.trim()
      load()
    })
    $('#c-refresh', el).addEventListener('click', load)
    await load()
  }

  async function load() {
    const el = $('#view-customers')
    if (!el) return
    const q = state.customerFilter.q
    const qs = new URLSearchParams({ limit: 200 })
    if (q) qs.set('q', q)
    const data = await api('/customers?' + qs.toString())
    state.customers = data.items || []

    $('#c-count', el).textContent = `${data.total} customer${data.total === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}`

    const tbl = $('#c-tbl', el)
    if (!state.customers.length) {
      tbl.innerHTML = '<tr><td><div class="empty">No customers yet.</div></td></tr>'
      return
    }
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Customer</th>
          <th>Phone</th>
          <th>Addresses</th>
          <th>Orders</th>
          <th>Total spent</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        ${state.customers
          .map(
            (c) => `
          <tr style="cursor:pointer" data-c="${esc(c.id)}">
            <td><div class="prod-name">${esc(c.name || '—')}</div><div class="prod-sub">${esc(c.email)}</div></td>
            <td>${c.phone ? '+91 ' + esc(c.phone) : '—'}</td>
            <td>${c.addressCount}</td>
            <td>${c.orderCount}</td>
            <td class="num">${money(c.totalSpent)}</td>
            <td class="num">${fmtDate(c.createdAt)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>`

    $$('#c-tbl [data-c]', el).forEach((row) =>
      row.addEventListener('click', () => openCustomer(row.dataset.c)),
    )
  }

  async function openCustomer(id) {
    try {
      const data = await api('/customers/' + encodeURIComponent(id) + '/orders')
      renderCustomerModal(data.customer, data.orders)
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  function renderCustomerModal(c, orders) {
    openModal(
      `
      <div class="modal-head">
        <h2>${esc(c.name || c.email)}</h2>
        <button class="x" data-close>×</button>
      </div>
      <div class="modal-body">
        <div class="status-line">
          <b>${esc(c.email)}</b>${c.phone ? ` · +91 ${esc(c.phone)}` : ''} ·
          joined <b>${fmtDate(c.createdAt)}</b> ·
          <b>${orders.length}</b> order${orders.length === 1 ? '' : 's'}
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Orders</h2></div>
          <div class="panel-body" style="padding-top:4px">
            ${
              orders.length
                ? orders
                    .map(
                      (o) => `
                    <div class="mv-row" style="cursor:pointer" data-cust-o="${esc(o.id)}">
                      <div class="mv-info">
                        <div class="name">${esc(o.id)}</div>
                        <div class="sub">${fmtDate(o.createdAt)} · ${o.mode === 'preowned' ? 'Pre-owned' : o.mode === 'trade' ? 'Trade' : 'Retail'} · ${o.itemCount} item${o.itemCount === 1 ? '' : 's'}</div>
                      </div>
                      <span class="tag ${STATUS_TAG[o.status] || 'low'}">${esc(STATUS_TEXT[o.status] || o.status)}</span>
                      <div class="num" style="font-family:Consolas,monospace;margin-left:12px">${money(o.total)}</div>
                    </div>`,
                    )
                    .join('')
                : '<div class="empty">This customer has no orders yet.</div>'
            }
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Close</button>
      </div>`,
      { wide: true },
    )
    bindModalClose()
    $$('[data-cust-o]').forEach((row) =>
      row.addEventListener('click', () => window.MS.openOrder(row.dataset.custO)),
    )
  }

  window.MS.renderCustomers = renderCustomers
})()
