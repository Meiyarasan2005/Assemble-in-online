/* Mei Spare · Inventory Admin — product form + stock adjustment */
;(function () {
  'use strict'

  const { $, $$, ICON, state, api, esc, toast, openModal, closeModal, bindModalClose } = window.MS

  /* ================= product form ================= */

  async function openProductForm(id) {
    let p = { fits: [], features: [] }
    if (id) {
      p = await api('/products/' + id)
    }
    const isNew = !id
    const m = openModal(
      `
      <div class="modal-head"><h2>${isNew ? 'New product' : 'Edit product'}</h2><button class="x" data-close>×</button></div>
      <form id="pf-form" class="modal-body" novalidate>
        <div class="form-grid">
          <div class="field full">
            <label class="req">Name</label>
            <input class="input" name="name" required value="${esc(p.name || '')}" placeholder="e.g. Ceramic Disc Brake Pad Set (Front)" />
          </div>
          <div class="field">
            <label class="req">Category</label>
            <select class="input" name="category" required>
              <option value="">— select —</option>
              ${state.categories
                .map((c) => `<option value="${esc(c.id)}" ${c.id === p.category ? 'selected' : ''}>${esc(c.name)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label class="req">Brand</label>
            <select class="input" name="brand" required>
              <option value="">— select —</option>
              ${state.brands.map((b) => `<option value="${esc(b)}" ${b === p.brand ? 'selected' : ''}>${esc(b)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Part №</label>
            <input class="input" name="part_no" value="${esc(p.part_no || '')}" placeholder="e.g. 0 986 AB1 238" />
          </div>
          <div class="field">
            <label>Badge</label>
            <select class="input" name="badge">
              <option value="">— none —</option>
              <option value="new" ${p.badge === 'new' ? 'selected' : ''}>New</option>
              <option value="top" ${p.badge === 'top' ? 'selected' : ''}>Best seller</option>
              <option value="sale" ${p.badge === 'sale' ? 'selected' : ''}>On sale</option>
              <option value="low" ${p.badge === 'low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
          <div class="field">
            <label class="req">Price ₹</label>
            <input class="input" name="price" type="number" min="0" step="any" required value="${p.price ?? ''}" placeholder="0" />
          </div>
          <div class="field">
            <label>MRP ₹</label>
            <input class="input" name="mrp" type="number" min="0" step="any" value="${p.mrp ?? ''}" placeholder="0" />
          </div>
          <div class="field">
            <label>Rating (0–5)</label>
            <input class="input" name="rating" type="number" min="0" max="5" step="0.1" value="${p.rating ?? '4.5'}" />
          </div>
          <div class="field">
            <label>Reviews</label>
            <input class="input" name="reviews" type="number" min="0" step="1" value="${p.reviews ?? 0}" />
          </div>
          ${isNew ? `
          <div class="field">
            <label>Initial stock</label>
            <input class="input" name="stock" type="number" min="0" step="1" value="0" />
          </div>` : ''}
          <div class="field full">
            <label>Description</label>
            <textarea class="input" name="desc" rows="3" placeholder="Optional short description">${esc(p.desc || '')}</textarea>
          </div>
          <div class="field full">
            <label>Features <small>(one per line)</small></label>
            <textarea class="input" name="features_text" rows="4" placeholder="Low-dust compound&#10;Precision balanced">${esc((p.features || []).join('\n'))}</textarea>
          </div>
          <div class="field full">
            <label>Fits vehicles</label>
            <div class="fits-grid">
              ${state.vehicles
                .map((v) => {
                  const fit = (p.fits || []).includes(v.id)
                  return `<label class="check-row"><input type="checkbox" name="fits" value="${esc(v.id)}" ${fit ? 'checked' : ''} /><span>${esc(v.make + ' ' + v.model)}${v.engine ? ` <small style="color:var(--faint)">(${esc(v.engine)})</small>` : ''}</span></label>`
                })
                .join('')}
            </div>
          </div>
          <div class="field">
            <label>Popular</label>
            <label class="check-row"><input type="checkbox" name="popular" ${p.popular ? 'checked' : ''} /> Mark as popular</label>
          </div>
        </div>
      </form>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn primary" id="pf-save">${isNew ? 'Create product' : 'Save changes'}</button>
      </div>`,
      { wide: true }
    )
    bindModalClose()
    $('#pf-save').addEventListener('click', () => submitProductForm(id, m))
  }

  async function submitProductForm(id, m) {
    const f = $('#pf-form', m)
    if (!f.reportValidity()) return
    const fd = new FormData(f)
    const body = {
      name: fd.get('name'),
      category: fd.get('category'),
      brand: fd.get('brand'),
      part_no: fd.get('part_no'),
      badge: fd.get('badge'),
      price: Number(fd.get('price')) || 0,
      mrp: Number(fd.get('mrp')) || 0,
      rating: Number(fd.get('rating')) || 0,
      reviews: Number(fd.get('reviews')) || 0,
      popular: !!fd.get('popular'),
      desc: fd.get('desc'),
      features: (fd.get('features_text') || '').split('\n').map((s) => s.trim()).filter(Boolean),
      fits: $$('input[name=fits]:checked', f).map((c) => c.value),
    }
    if (!id) body.stock = Number(fd.get('stock')) || 0
    try {
      if (id) {
        await api('/products/' + id, { method: 'PUT', body: JSON.stringify(body) })
        toast('Product updated')
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(body) })
        toast('Product created')
      }
      closeModal()
      window.MS.renderProducts()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  /* ================= stock modal ================= */

  async function openStockModal(id) {
    const p = await api('/products/' + id)
    const m = openModal(
      `
      <div class="modal-head"><h2>Adjust stock · <span style="color:var(--accent)">${esc(p.name)}</span></h2><button class="x" data-close>×</button></div>
      <div class="modal-body">
        <div class="status-line" style="margin:0 0 14px">Current quantity: <b id="st-qty">${p.stock}</b></div>
        <div class="form-grid">
          <div class="field">
            <label>In / out</label>
            <div class="stepper" id="st-stepper">
              <button type="button" data-step="-1">−</button>
              <span id="st-amt">0</span>
              <button type="button" data-step="1">+</button>
            </div>
          </div>
          <div class="field">
            <label>Amount</label>
            <input class="input" id="st-num" type="number" value="1" min="1" step="1" />
          </div>
          <div class="field full">
            <label>Note</label>
            <input class="input" id="st-memo" placeholder="e.g. GRN #204, sold to walk-in, damaged…" />
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn primary" id="st-go">Apply adjustment</button>
      </div>`,
      { small: true }
    )
    bindModalClose()

    let amount = 0
    const $amt = $('#st-amt', m)
    const $num = $('#st-num', m)
    const $qty = $('#st-qty', m)
    const apply = (n) => {
      amount = Math.round(Number(n) || 0)
      $amt.textContent = amount > 0 ? '+' + amount : String(amount)
      $amt.style.color = amount < 0 ? 'var(--red)' : 'var(--green)'
      const next = p.stock + amount
      $qty.textContent = Math.max(0, next)
      $qty.style.color = next < 0 ? 'var(--red)' : ''
    }
    $$('[data-step]', m).forEach((b) =>
      b.addEventListener('click', () => apply((amount || 0) + Number(b.dataset.step) * (Number($num.value) || 1)))
    )
    $num.addEventListener('input', () => apply(amount))
    $amt.addEventListener('click', () => apply(-amount))

    $('#st-go', m).addEventListener('click', async () => {
      if (!amount) return
      try {
        const r = await api('/products/' + id + '/stock', {
          method: 'POST',
          body: JSON.stringify({ delta: amount, note: $('#st-memo', m).value.trim(), reason: 'Admin adjustment' }),
        })
        toast(`${amount > 0 ? '+' : ''}${amount} → ${r.stock}`)
        closeModal()
        window.MS.renderProducts()
      } catch (e) {
        toast(e.message, 'err')
      }
    })
  }

  window.MS.openProductForm = openProductForm
  window.MS.openStockModal = openStockModal
})()
