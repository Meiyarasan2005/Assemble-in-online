/* Mei Spare · Admin — orders */
;(function () {
  'use strict'

  const { $, $$, state, api, esc, fmtDate, money, toast, openModal, closeModal, bindModalClose } = window.MS

  const STATUS_TEXT = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  const STATUS_TAG = {
    pending: 'stock-low',
    confirmed: 'top',
    shipped: 'new',
    delivered: 'stock-in',
    cancelled: 'sale',
  }

  const PAY_TEXT = {
    paid: 'Paid',
    unpaid: 'Unpaid',
    cod: 'COD',
    failed: 'Failed',
    refunded: 'Refunded',
  }

  state.orderFilter = { q: '', status: '' }
  state.orders = []

  function statusTag(s) {
    return `<span class="tag ${STATUS_TAG[s] || 'low'}">${esc(STATUS_TEXT[s] || s)}</span>`
  }

  function payTag(p) {
    const cls = p === 'paid' || p === 'cod' ? 'stock-in' : p === 'failed' || p === 'refunded' ? 'stock-out' : 'low'
    return `<span class="tag ${cls}">${esc(PAY_TEXT[p] || p)}</span>`
  }

  async function renderOrders() {
    const el = $('#view-orders')
    if (!el) return

    el.innerHTML = `
      <div class="toolbar">
        <input id="o-q" class="input grow" type="search" placeholder="Search order id, email, name or phone…" value="${esc(state.orderFilter.q)}" />
        <select id="o-status" class="input">
          <option value="">All statuses</option>
          ${Object.entries(STATUS_TEXT)
            .map(([k, v]) => `<option value="${k}" ${state.orderFilter.status === k ? 'selected' : ''}>${v}</option>`)
            .join('')}
        </select>
        <button class="btn" id="o-refresh">↺ Refresh</button>
      </div>
      <div class="status-line" id="o-count"></div>
      <div class="panel">
        <div class="tbl-wrap">
          <table class="tbl" id="o-tbl"></table>
        </div>
      </div>`

    $('#o-q', el).addEventListener('input', (e) => {
      state.orderFilter.q = e.target.value.trim()
      load()
    })
    $('#o-status', el).addEventListener('change', (e) => {
      state.orderFilter.status = e.target.value
      load()
    })
    $('#o-refresh', el).addEventListener('click', load)
    await load()
  }

  async function load() {
    const el = $('#view-orders')
    if (!el) return
    const q = state.orderFilter.q
    const status = state.orderFilter.status
    const qs = new URLSearchParams({ limit: 200 })
    if (q) qs.set('q', q)
    if (status) qs.set('status', status)
    const data = await api('/orders?' + qs.toString())
    state.orders = data.items || []

    $('#o-count', el).textContent = `${data.total} order${data.total === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}`

    const tbl = $('#o-tbl', el)
    if (!state.orders.length) {
      tbl.innerHTML = '<tr><td><div class="empty">No orders found.</div></td></tr>'
      return
    }
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Placed</th>
        </tr>
      </thead>
      <tbody>
        ${state.orders
          .map(
            (o) => `
          <tr style="cursor:pointer" data-o="${esc(o.id)}">
            <td><div class="prod-name">${esc(o.id)}</div><div class="prod-sub">${o.mode === 'preowned' ? 'Pre-owned' : o.mode === 'trade' ? 'Trade' : 'Retail'}</div></td>
            <td><div class="prod-name">${esc(o.name)}</div><div class="prod-sub">${esc(o.email)}</div></td>
            <td>${o.itemCount}</td>
            <td class="num">${money(o.total)}</td>
            <td>${payTag(o.paymentStatus)}</td>
            <td>${statusTag(o.status)}</td>
            <td class="num">${fmtDate(o.createdAt)}</td>
          </tr>`,
          )
          .join('')}
      </tbody>`

    $$('#o-tbl [data-o]', el).forEach((row) =>
      row.addEventListener('click', () => openOrder(row.dataset.o)),
    )
  }

  async function openOrder(id) {
    try {
      const o = await api('/orders/' + id)
      renderOrderModal(o)
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  function renderOrderModal(o) {
    openModal(
      `
      <div class="modal-head">
        <h2>${esc(o.id)}</h2>
        <button class="x" data-close>×</button>
      </div>
      <div class="modal-body">
        <div class="status-line">
          ${statusTag(o.status)} ${payTag(o.paymentStatus)} ·
          placed <b>${fmtDate(o.createdAt)}</b>
          ${o.trackingNumber ? `· <b>${esc(o.carrier)}</b> ${esc(o.trackingNumber)}` : ''}
        </div>

        <div class="two-col">
          <div class="panel">
            <div class="panel-head"><h2>Items</h2></div>
            <div class="panel-body" style="padding-top:4px">
              ${o.items
                .map(
                  (i) => `
                <div class="mv-row">
                  <div class="mv-info">
                    <div class="name">${esc(i.name)}</div>
                    <div class="sub">${esc(i.partNo)} · ${esc(i.brand)} · Qty ${i.qty}</div>
                  </div>
                  <div class="num" style="font-family:Consolas,monospace">${money(i.total)}</div>
                </div>`,
                )
                .join('')}
              <div class="mv-row" style="border-top:1px solid var(--line2)">
                <div class="mv-info"><div class="name">Subtotal</div></div>
                <div class="num" style="font-family:Consolas,monospace">${money(o.subtotal)}</div>
              </div>
              <div class="mv-row">
                <div class="mv-info"><div class="name">Delivery</div></div>
                <div class="num" style="font-family:Consolas,monospace">${o.delivery === 0 ? 'FREE' : money(o.delivery)}</div>
              </div>
              <div class="mv-row">
                <div class="mv-info"><div class="name"><strong>Total</strong></div></div>
                <div class="num" style="font-family:Consolas,monospace;font-weight:700">${money(o.total)}</div>
              </div>
            </div>
          </div>

          <div>
            <div class="panel">
              <div class="panel-head"><h2>Customer & address</h2></div>
              <div class="panel-body" style="padding-top:4px">
                <div class="mv-row"><div class="mv-info"><div class="name">${esc(o.name)}</div><div class="sub">${esc(o.email)} · +91 ${esc(o.phone)}</div></div></div>
                <div class="mv-row">
                  <div class="mv-info">
                    <div class="name">${esc(o.address.line1)}${o.address.line2 ? ', ' + esc(o.address.line2) : ''}</div>
                    <div class="sub">${esc(o.address.city)}, ${esc(o.address.state)} — ${esc(o.address.pincode)}</div>
                  </div>
                </div>
                <div class="mv-row">
                  <div class="mv-info">
                    <div class="name">Payment · ${esc(PAY_TEXT[o.paymentStatus] || o.paymentStatus)}</div>
                    <div class="sub">${o.paymentMethod ? esc(o.paymentMethod.toUpperCase()) : ''}${o.paymentRef ? ' · Ref ' + esc(o.paymentRef) : ''}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-head"><h2>Update status</h2></div>
              <div class="panel-body">
                <div class="field">
                  <label class="req">New status</label>
                  <select class="input" id="o-status-next">
                    ${Object.entries(STATUS_TEXT)
                      .map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`)
                      .join('')}
                  </select>
                </div>
                <div id="o-ship-fields" style="display:none;margin-top:10px">
                  <div class="form-grid">
                    <div class="field"><label>Carrier</label><input class="input" id="o-carrier" value="SpareXpress Logistics" /></div>
                    <div class="field"><label>Tracking number</label><input class="input" id="o-track" placeholder="auto-generate if blank" /></div>
                  </div>
                </div>
                <div class="field" style="margin-top:10px">
                  <label>Note (visible to customer)</label>
                  <input class="input" id="o-note" placeholder="e.g. Dispatched via BlueDart" />
                </div>
              </div>
            </div>
          </div>
        </div>

        ${(o.events && o.events.length) ? `
        <div class="panel">
          <div class="panel-head"><h2>Activity timeline</h2></div>
          <div class="panel-body" style="padding-top:4px">
            ${o.events
              .map(
                (e) => `
              <div class="mv-row">
                <span class="tag ${STATUS_TAG[e.status] || 'low'}">${esc(STATUS_TEXT[e.status] || e.status)}</span>
                <div class="mv-info">
                  <div class="name">${esc(e.note || '')}</div>
                </div>
                <div class="mv-time">${fmtDate(e.at)}</div>
              </div>`,
              )
              .join('')}
          </div>
        </div>` : ''}
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Close</button>
        <button class="btn primary" id="o-save">Save status</button>
      </div>`,
      { wide: true },
    )
    bindModalClose()

    const statusSel = $('#o-status-next')
    const shipFields = $('#o-ship-fields')
    const showShip = () => (shipFields.style.display = statusSel.value === 'shipped' ? '' : 'none')
    statusSel.addEventListener('change', showShip)
    showShip()

    $('#o-save').addEventListener('click', async () => {
      const status = statusSel.value
      if (status === o.status) {
        closeModal()
        return
      }
      const body = { status, note: $('#o-note').value.trim() }
      if (status === 'shipped') {
        body.carrier = $('#o-carrier').value.trim()
        body.trackingNumber = $('#o-track').value.trim()
      }
      try {
        await api('/orders/' + o.id + '/status', { method: 'PUT', body: JSON.stringify(body) })
        toast('Order updated')
        closeModal()
        load()
      } catch (e) {
        toast(e.message, 'err')
      }
    })
  }

  window.MS.renderOrders = renderOrders
  window.MS.openOrder = openOrder
})()
