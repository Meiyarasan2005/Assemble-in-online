/* Mei Spare · Inventory Admin — movements, categories, vehicles, init */
;(function () {
  'use strict'

  const { $, $$, ICON, state, api, esc, fmtDate, catColor, toast, openModal, closeModal, bindModalClose } = window.MS

  /* ================= movements ================= */

  async function renderMovements() {
    const data = await api('/stock-movements?limit=300')
    const moves = Array.isArray(data) ? data : []
    state.moves = moves

    let el = $('#view-movements')
    if (!el) return

    el.innerHTML = `
      <div class="status-line">${moves.length} movement${moves.length === 1 ? '' : 's'} recorded</div>
      <div class="toolbar">
        <input id="mv-q" class="input grow" type="search" placeholder="Search product name…" />
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel-head"><h2>Per product</h2></div>
          <div class="panel-body" id="mv-by"></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Latest log</h2></div>
          <div class="panel-body" id="mv-log"></div>
        </div>
      </div>`

    const qEl = $('#mv-q', el)
    const render = () => {
      const term = (qEl.value || '').trim().toLowerCase()
      const filtered = term ? moves.filter((m) => (m.product_name || '').toLowerCase().includes(term)) : moves

      const by = {}
      filtered.forEach((m) => {
        const key = m.product_id
        if (!by[key]) by[key] = { id: key, name: m.product_name || '#' + key, delta: 0 }
        by[key].delta += m.delta
      })
      const perProduct = Object.values(by).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

      const byEl = $('#mv-by', el)
      if (!perProduct.length) {
        byEl.innerHTML = '<div class="empty">No stock movement yet.</div>'
      } else {
        byEl.innerHTML = perProduct
          .map(
            (p) => `
          <div class="mv-row">
            <div class="mv-delta ${p.delta < 0 ? 'down' : 'up'}">${p.delta > 0 ? '+' : ''}${p.delta}</div>
            <div class="mv-info"><div class="name">${esc(p.name)}</div></div>
          </div>`
          )
          .join('')
      }

      const logEl = $('#mv-log', el)
      if (!filtered.length) {
        logEl.innerHTML = '<div class="empty">No movements yet.</div>'
      } else {
        logEl.innerHTML = filtered
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
    }
    qEl.addEventListener('input', render)
    render()
  }

  /* ================= categories ================= */

  async function renderCategories() {
    let el = $('#view-categories')
    if (!el) return
    el.innerHTML = `
      <div class="two-col">
        <div class="panel">
          <div class="panel-head"><h2>Categories</h2><button class="btn sm" id="cat-add">＋ Add</button></div>
          <div class="panel-body" id="cat-list"></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Brands</h2></div>
          <div class="panel-body" id="brand-list"></div>
        </div>
      </div>`

    const list = $('#cat-list', el)
    if (!state.categories.length) {
      list.innerHTML = '<div class="empty">No categories yet.</div>'
    } else {
      list.innerHTML = state.categories
        .map(
          (c) => `
        <div class="list-row">
          <span class="cat-dot" style="background:${catColor(c.id)}"></span>
          <div class="info"><strong>${esc(c.name)}</strong><span>${c.product_count ?? 0} products</span></div>
          <div class="actions">
            <button class="btn sm ghost" data-edit-cat="${esc(c.id)}" title="Rename">${ICON.edit}</button>
            <button class="btn sm danger ghost" data-del-cat="${esc(c.id)}" title="Delete">${ICON.trash}</button>
          </div>
        </div>`
        )
        .join('')
    }

    const brands = $('#brand-list', el)
    if (!state.brands.length) {
      brands.innerHTML = '<div class="empty">No brands yet.</div>'
    } else {
      brands.innerHTML = state.brands
        .map((b) => `<div class="list-row"><div class="info"><strong>${esc(b)}</strong></div></div>`)
        .join('')
    }

    $('#cat-add', el).addEventListener('click', () => catForm())
    $$('#cat-list [data-edit-cat]', el).forEach((b) =>
      b.addEventListener('click', () => catForm(b.dataset.editCat))
    )
    $$('#cat-list [data-del-cat]', el).forEach((b) =>
      b.addEventListener('click', async () => {
        const c = state.categories.find((x) => String(x.id) === b.dataset.delCat)
        if (!confirm(`Delete category "${c.name}"?`)) return
        try {
          await api('/categories/' + c.id, { method: 'DELETE' })
          toast('Category deleted')
          await reloadMeta()
          renderCategories()
        } catch (e) {
          toast(e.message, 'err')
        }
      })
    )
  }

  function catForm(id) {
    const c = id ? state.categories.find((x) => String(x.id) === String(id)) : {}
    openModal(
      `
      <div class="modal-head"><h2>${c ? 'Edit category' : 'New category'}</h2><button class="x" data-close>×</button></div>
      <div class="modal-body">
        <div class="field"><label class="req">Name</label><input class="input" id="cat-name" value="${esc(c.name || '')}" placeholder="e.g. Filters & Fluids" /></div>
        <div class="field"><label>Short name</label><input class="input" id="cat-short" value="${esc(c.short || '')}" placeholder="e.g. Filters" /></div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn primary" id="cat-save">Save</button>
      </div>`,
      { small: true }
    )
    bindModalClose()
    $('#cat-save').addEventListener('click', async () => {
      const body = {
        name: $('#cat-name').value.trim(),
        short: $('#cat-short').value.trim() || $('#cat-name').value.trim(),
      }
      if (!body.name) return
      try {
        if (id) await api('/categories/' + id, { method: 'PUT', body: JSON.stringify(body) })
        else await api('/categories', { method: 'POST', body: JSON.stringify(body) })
        toast('Saved')
        closeModal()
        await reloadMeta()
        renderCategories()
      } catch (e) {
        toast(e.message, 'err')
      }
    })
  }

  async function reloadMeta() {
    const [cats, brands, vehs] = await Promise.all([api('/categories'), api('/brands'), api('/vehicles')])
    state.categories = cats
    state.brands = brands
    state.vehicles = vehs
  }

  /* ================= vehicles ================= */

  async function renderVehicles() {
    let el = $('#view-vehicles')
    if (!el) return
    el.innerHTML = `
      <div class="status-line">${state.vehicles.length} fitment entries</div>
      <div class="panel">
        <div class="panel-head"><h2>Vehicles</h2><button class="btn sm" id="veh-add">＋ Add</button></div>
        <div class="panel-body" id="veh-list"></div>
      </div>`

    const list = $('#veh-list', el)
    if (!state.vehicles.length) {
      list.innerHTML = '<div class="empty">No vehicles in the fitment database.</div>'
    } else {
      list.innerHTML = state.vehicles
        .map(
          (v) => `
        <div class="list-row">
          <div class="info"><strong>${esc(v.make + ' ' + v.model)}</strong><span>${esc(v.years || '')}${v.engine ? ' · ' + esc(v.engine) : ''}</span></div>
          <div class="actions">
            <button class="btn sm ghost" data-edit-veh="${esc(v.id)}" title="Edit">${ICON.edit}</button>
            <button class="btn sm danger ghost" data-del-veh="${esc(v.id)}" title="Delete">${ICON.trash}</button>
          </div>
        </div>`
        )
        .join('')
    }

    $('#veh-add', el).addEventListener('click', () => vehForm())
    $$('#veh-list [data-edit-veh]', el).forEach((b) =>
      b.addEventListener('click', () => vehForm(b.dataset.editVeh))
    )
    $$('#veh-list [data-del-veh]', el).forEach((b) =>
      b.addEventListener('click', async () => {
        const v = state.vehicles.find((x) => String(x.id) === b.dataset.delVeh)
        if (!confirm(`Delete vehicle "${v.make} ${v.model}"?`)) return
        try {
          await api('/vehicles/' + v.id, { method: 'DELETE' })
          toast('Vehicle deleted')
          await reloadMeta()
          renderVehicles()
        } catch (e) {
          toast(e.message, 'err')
        }
      })
    )
  }

  function vehForm(id) {
    const v = id ? state.vehicles.find((x) => String(x.id) === String(id)) : {}
    openModal(
      `
      <div class="modal-head"><h2>${v ? 'Edit vehicle' : 'New vehicle'}</h2><button class="x" data-close>×</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="field full"><label class="req">Make</label><input class="input" id="veh-make" value="${esc(v.make || '')}" placeholder="e.g. Maruti Suzuki" /></div>
          <div class="field full"><label class="req">Model</label><input class="input" id="veh-model" value="${esc(v.model || '')}" placeholder="e.g. Swift" /></div>
          <div class="field"><label>Years</label><input class="input" id="veh-years" value="${esc(v.years || '')}" placeholder="e.g. 2018 – 2024" /></div>
          <div class="field"><label>Engine</label><input class="input" id="veh-engine" value="${esc(v.engine || '')}" placeholder="e.g. 1.2L K12C" /></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn primary" id="veh-save">Save</button>
      </div>`,
      { small: true }
    )
    bindModalClose()
    $('#veh-save').addEventListener('click', async () => {
      const make = $('#veh-make').value.trim()
      const model = $('#veh-model').value.trim()
      if (!make || !model) return
      const body = { make, model, years: $('#veh-years').value.trim(), engine: $('#veh-engine').value.trim() }
      try {
        if (id) await api('/vehicles/' + id, { method: 'PUT', body: JSON.stringify(body) })
        else await api('/vehicles', { method: 'POST', body: JSON.stringify(body) })
        toast('Saved')
        closeModal()
        await reloadMeta()
        renderVehicles()
      } catch (e) {
        toast(e.message, 'err')
      }
    })
  }

  /* ================= misc ================= */

  async function reseed() {
    if (!confirm('Reset the entire database from the seed catalogue? All current data (products, stock, log, categories, vehicles) is lost.')) return
    try {
      const r = await api('/admin/reseed', { method: 'POST' })
      toast(`Re-seeded · ${r.products} products, ${r.movements} movements`)
      await window.MS.loadAll()
      window.MS.render()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  $('#btn-reseed').addEventListener('click', reseed)
  $('#btn-new').addEventListener('click', () => window.MS.openProductForm())

  /* ================= go ================= */

  window.MS.renderMovements = renderMovements
  window.MS.renderCategories = renderCategories
  window.MS.renderVehicles = renderVehicles

  window.MS.start()
})()
