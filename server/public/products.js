/* Mei Spare · Inventory Admin — dashboard + product list */
;(function () {
  'use strict'

  const { $, $$, ICON, state, api, esc, money, fmtDate, catColor, stockTag, badgeTag, toast, openModal, closeModal, bindModalClose } = window.MS

  /* ================= dashboard ================= */

  async function renderDashboard() {
    const [stats, low, out, recent] = await Promise.all([
      api('/stats'),
      api('/products?status=low&limit=6'),
      api('/products?status=out&limit=6'),
      api('/orders?limit=6'),
    ])
    let el = $('#view-dashboard')
    if (!el) return
    const lowItems = Array.isArray(low) ? low : low.items || []
    const outItems = Array.isArray(out) ? out : out.items || []
    const moves = stats.movements || []
    const orders = (recent && recent.items) || []

    const statCfg = [
      ['stat-total', 'Products', stats.skus, ''],
      ['stat-value', 'Stock value', stats.stockValue, 'good', 'inr'],
      ['stat-orders', 'Orders', stats.orderCount, ''],
      ['stat-rev', 'Revenue', stats.revenue, 'good', 'inr'],
      ['stat-customers', 'Customers', stats.customersCount, ''],
      ['stat-low', 'Low stock', stats.lowStock, stats.lowStock ? 'warn' : ''],
      ['stat-out', 'Out of stock', stats.outOfStock, stats.outOfStock ? 'bad' : ''],
    ]
    el.innerHTML = `
      <div class="cards">
        ${statCfg
          .map(
            ([id, k, v, cls, inrCls]) =>
              `<div class="stat" id="${id}"><div class="k">${k}</div><div class="v ${cls} ${inrCls || ''}" data-val="${v}">—</div></div>`
          )
          .join('')}
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel-head"><h2>Recent orders</h2><a class="btn ghost sm" data-jump="orders">All orders →</a></div>
          <div class="panel-body" id="dash-orders"></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Recent movements</h2><a class="btn ghost sm" data-jump="movements">View log →</a></div>
          <div class="panel-body" id="dash-moves"></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Stock alerts</h2><a class="btn ghost sm" data-jump="products">Manage stock →</a></div>
          <div class="panel-body" id="dash-low"></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Order pipeline</h2><a class="btn ghost sm" data-jump="orders">Fulfil →</a></div>
          <div class="panel-body" id="dash-pipe"></div>
        </div>
      </div>`

    const ordersEl = $('#dash-orders', el)
    if (!orders.length) {
      ordersEl.innerHTML = '<div class="empty">No orders yet.</div>'
    } else {
      ordersEl.innerHTML = orders
        .map(
          (o) => `
        <div class="mv-row" style="cursor:pointer" data-jump-order="${esc(o.id)}">
          <div class="mv-info">
            <div class="name">${esc(o.id)} · ${esc(o.name)}</div>
            <div class="sub">${fmtDate(o.createdAt)} · ${o.itemCount} item${o.itemCount === 1 ? '' : 's'}</div>
          </div>
          <span class="tag ${o.status === 'delivered' ? 'stock-in' : o.status === 'cancelled' ? 'sale' : o.status === 'shipped' ? 'new' : o.status === 'confirmed' ? 'top' : 'low'}">${esc(({ pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' })[o.status] || o.status)}</span>
          <div class="mv-time">${money(o.total)}</div>
        </div>`
        )
        .join('')
    }

    const movesEl = $('#dash-moves', el)
    if (!moves.length) {
      movesEl.innerHTML = '<div class="empty">No movements yet.</div>'
    } else {
      movesEl.innerHTML = moves
        .map(
          (m) => `
        <div class="mv-row">
          <div class="mv-delta ${m.delta < 0 ? 'down' : 'up'}">${m.delta > 0 ? '+' : ''}${m.delta}</div>
          <div class="mv-info">
            <div class="name">${esc(m.product_name)}</div>
            <div class="sub">${m.note ? esc(m.note) : esc(m.reason)}</div>
          </div>
          <div class="mv-time">${fmtDate(m.created_at)}</div>
        </div>`
        )
        .join('')
    }

    const lowEl = $('#dash-low', el)
    const alerts = [...lowItems, ...outItems].slice(0, 8)
    if (!alerts.length) {
      lowEl.innerHTML = '<div class="empty">All products are well stocked.</div>'
    } else {
      lowEl.innerHTML = alerts
        .map(
          (p) => `
        <div class="mv-row">
          <div class="mv-delta down">${p.stock}</div>
          <div class="mv-info">
            <div class="name">${esc(p.name)}</div>
            <div class="sub">${esc(p.brand || '')}${p.part_no ? ' · ' + esc(p.part_no) : ''}</div>
          </div>
          ${stockTag(p.stock)}
        </div>`
        )
        .join('')
    }

    const pipeEl = $('#dash-pipe', el)
    const pipe = [
      ['pending', 'Pending payment', stats.statusCounts.pending],
      ['confirmed', 'Confirmed', stats.statusCounts.confirmed],
      ['shipped', 'In transit', stats.statusCounts.shipped],
      ['delivered', 'Delivered', stats.statusCounts.delivered],
      ['cancelled', 'Cancelled', stats.statusCounts.cancelled],
    ]
    pipeEl.innerHTML = pipe
      .map(
        ([k, label, n]) => `
      <div class="mv-row">
        <div class="mv-info"><div class="name">${label}</div></div>
        <span class="tag ${k === 'cancelled' ? 'sale' : k === 'pending' ? 'low' : k === 'delivered' ? 'stock-in' : 'top'}">${n}</span>
      </div>`
      )
      .join('')

    el.querySelectorAll('[data-jump]').forEach((b) =>
      b.addEventListener('click', () => window.MS.setView(b.dataset.jump))
    )
    el.querySelectorAll('[data-jump-order]').forEach((b) =>
      b.addEventListener('click', () => window.MS.openOrder(b.dataset.jumpOrder))
    )
  }

  /* ================= product list ================= */

  async function renderProducts() {
    const q = new URLSearchParams()
    const f = state.productFilter
    if (f.q) q.set('search', f.q)
    if (f.cat) q.set('category', f.cat)
    if (f.brand) q.set('brand', f.brand)
    if (f.status) q.set('status', f.status)
    q.set('sort', f.sort)
    q.set('limit', '500')

    const data = await api('/products?' + q.toString())
    const products = Array.isArray(data) ? data : data.items || []
    state.products = products

    let el = $('#view-products')
    if (!el) return

    const catOpts = `<option value="">All categories</option>${state.categories
      .map((c) => `<option value="${esc(c.id)}" ${c.id === f.cat ? 'selected' : ''}>${esc(c.name)}</option>`)
      .join('')}`
    const brandOpts = `<option value="">All brands</option>${state.brands
      .map((b) => `<option value="${esc(b)}" ${b === f.brand ? 'selected' : ''}>${esc(b)}</option>`)
      .join('')}`
    const sortMap = {
      name: ['name', 'Sort · name'],
      price_asc: ['price_asc', 'Sort · price ↑'],
      price_desc: ['price_desc', 'Sort · price ↓'],
      stock_asc: ['stock_asc', 'Sort · stock ↑'],
      stock_desc: ['stock_desc', 'Sort · stock ↓'],
      updated: ['updated', 'Sort · updated'],
    }

    el.innerHTML = `
      <div class="status-line"><b>${products.length}</b> product${products.length === 1 ? '' : 's'}${
      f.q ? ` matching “${esc(f.q)}”` : ''
    }</div>
      <div class="toolbar">
        <input id="pf-q" class="input grow" type="search" placeholder="Search name / part no…" value="${esc(f.q)}" />
        <select id="pf-cat" class="input">${catOpts}</select>
        <select id="pf-brand" class="input">${brandOpts}</select>
        <select id="pf-status" class="input">
          <option value="">Any stock</option>
          <option value="in" ${f.status === 'in' ? 'selected' : ''}>In stock</option>
          <option value="low" ${f.status === 'low' ? 'selected' : ''}>Low stock</option>
          <option value="out" ${f.status === 'out' ? 'selected' : ''}>Out of stock</option>
        </select>
        <select id="pf-sort" class="input">
          ${Object.values(sortMap)
            .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`)
            .join('')}
        </select>
      </div>
      <div class="tbl-wrap panel">
        <table class="tbl">
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Brand</th><th>Part №</th>
              <th class="num">Price</th><th class="num">MRP</th><th class="num">Stock</th><th>Badges</th><th></th>
            </tr>
          </thead>
          <tbody id="prod-rows"></tbody>
        </table>
      </div>`

    bindProductFilters(el)

    const rows = $('#prod-rows', el)
    if (!products.length) {
      rows.innerHTML = `<tr><td colspan="9"><div class="empty"><p>${
        f.q ? 'Nothing matches that search.' : 'No products yet.'
      }</p></div></td></tr>`
      return
    }

    rows.innerHTML = products
      .map((p) => {
        const cat = state.categories.find((c) => c.id === p.category)
        const badges = []
        if (p.popular) badges.push('top')
        if (p.badge) badges.push(p.badge)
        return `
        <tr>
          <td>
            <div class="prod-name">${esc(p.name)}</div>
            <div class="prod-sub">${esc(p.id)}${p.fits.length ? ' · fits ' + p.fits.length : ''}</div>
          </td>
          <td>
            ${cat ? `<span class="cat-dot" style="background:${catColor(cat.id)}"></span>${esc(cat.name)}` : '<span style="color:var(--faint)">—</span>'}
          </td>
          <td>${p.brand ? `<span class="tag brand">${esc(p.brand)}</span>` : '<span style="color:var(--faint)">—</span>'}</td>
          <td style="font-family:Consolas,monospace">${esc(p.part_no || '')}</td>
          <td class="num">${money(p.price)}</td>
          <td class="num">${money(p.mrp)}</td>
          <td class="num">${p.stock}</td>
          <td>${stockTag(p.stock)} ${badges.map(badgeTag).join(' ')}</td>
          <td class="cell-actions">
            <button class="btn sm ghost" title="Adjust stock" data-act="stock" data-id="${p.id}">${ICON.stock}</button>
            <button class="btn sm ghost" title="Edit" data-act="edit" data-id="${p.id}">${ICON.edit}</button>
            <button class="btn sm danger ghost" title="Delete" data-act="del" data-id="${p.id}">${ICON.trash}</button>
          </td>
        </tr>`
      })
      .join('')
  }

  function bindProductFilters(el) {
    const $q = $('#pf-q', el)
    if ($q) {
      let t
      $q.addEventListener('input', () => {
        clearTimeout(t)
        t = setTimeout(() => {
          state.productFilter.q = $q.value.trim()
          renderProducts()
        }, 250)
      })
    }
    const $c = $('#pf-cat', el)
    if ($c) $c.addEventListener('change', () => { state.productFilter.cat = $c.value; renderProducts() })
    const $b = $('#pf-brand', el)
    if ($b) $b.addEventListener('change', () => { state.productFilter.brand = $b.value; renderProducts() })
    const $s = $('#pf-status', el)
    if ($s) $s.addEventListener('change', () => { state.productFilter.status = $s.value; renderProducts() })
    const $sort = $('#pf-sort', el)
    if ($sort) $sort.addEventListener('change', () => { state.productFilter.sort = $sort.value; renderProducts() })
  }

  function bindRowActions() {
    const rows = $('#view-products')
    if (!rows) return
    rows.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]')
      if (!btn) return
      const id = btn.dataset.id
      if (btn.dataset.act === 'edit') window.MS.openProductForm(id)
      else if (btn.dataset.act === 'stock') window.MS.openStockModal(id)
      else if (btn.dataset.act === 'del') deleteProduct(id)
    })
  }

  async function deleteProduct(id) {
    const p = state.products.find((x) => String(x.id) === String(id))
    if (!p) return
    openModal(
      `
      <div class="modal-head"><h2>Delete product?</h2><button class="x" data-close>×</button></div>
      <div class="modal-body">
        <p style="margin:0;color:var(--muted)">“<b style="color:var(--text)">${esc(p.name)}</b>” will be permanently removed together with its stock history.</p>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn danger" id="del-go">Delete permanently</button>
      </div>`,
      { small: true }
    )
    bindModalClose()
    $('#del-go').addEventListener('click', async () => {
      try {
        await api('/products/' + id, { method: 'DELETE' })
        toast('Product deleted')
        closeModal()
        renderProducts()
      } catch (e) {
        toast(e.message, 'err')
      }
    })
  }

  window.MS.renderDashboard = renderDashboard
  window.MS.renderProducts = renderProducts
  bindRowActions()
})()
