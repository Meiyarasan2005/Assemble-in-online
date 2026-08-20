/* Mei Spare · Inventory Admin — offers (storefront promotions) */
;(function () {
  'use strict'

  const { $, ICON, api, esc, money, fmtDate, toast, openModal, closeModal, bindModalClose } = window.MS

  function badgeTag(b) {
    const map = { new: 'New', top: 'Best', sale: 'Sale', low: 'Low' }
    return map[b] ? `<span class="tag ${b}">${map[b]}</span>` : ''
  }

  function offerBadge(o) {
    if (o.discount_pct > 0) return `<span class="tag sale">${o.discount_pct}% OFF</span>`
    return badgeTag(o.badge)
  }

  /* ================= list ================= */

  async function renderOffers() {
    let offers = []
    try {
      offers = await api('/offers')
    } catch {
      offers = []
    }
    const products = await api('/products?limit=500')
    const productRows = Array.isArray(products) ? products : products.items || []
    const byId = new Map(productRows.map((p) => [p._id || p.id, p]))

    let el = $('#view-offers')
    if (!el) return
    el.innerHTML = `
      <div class="status-line"><b>${offers.length}</b> offer${offers.length === 1 ? '' : 's'} — shown as a pop-up + banner on the storefront homepage when active</div>
      <div class="toolbar">
        <button class="btn primary" id="offer-new">＋ New offer</button>
      </div>
      <div id="offer-grid" class="offer-grid"></div>`

    const grid = $('#offer-grid', el)
    if (!offers.length) {
      grid.innerHTML = `<div class="panel"><div class="empty"><p>No offers yet.</p><button class="btn primary" data-new>Create your first offer</button></div></div>`
    } else {
      grid.innerHTML = offers
        .map((o) => {
          const linked = byId.get(o.product_id)
          const expired = o.ends_at && o.ends_at < new Date().toISOString()
          return `
          <div class="offer-card panel">
            <div class="offer-img">
              ${o.image ? `<img src="${o.image}" alt="${esc(o.title)}" />` : '<div class="offer-img-none">No image</div>'}
              ${offerBadge(o)}
            </div>
            <div class="offer-body">
              <div class="offer-tags">
                ${badgeTag(o.badge)}
                <span class="tag ${o.active ? 'stock-in' : 'low'}">${o.active ? 'Live' : 'Paused'}</span>
                ${expired ? '<span class="tag sale">Expired</span>' : ''}
              </div>
              <div class="offer-title">${esc(o.title)}</div>
              <div class="offer-desc">${esc(o.description || '')}</div>
              <div class="offer-meta">
                ${linked ? `<span class="tag brand">→ ${esc(linked.name)}</span>` : '<span style="color:var(--faint)">No linked product</span>'}
              </div>
              <div class="offer-foot">
                <span class="offer-date">${o.ends_at ? 'Until ' + fmtDate(o.ends_at) : 'No expiry'}</span>
                <div class="cell-actions">
                  <button class="btn sm ghost" title="Toggle live" data-act="toggle" data-id="${esc(o.id)}">${o.active ? 'Pause' : 'Live'}</button>
                  <button class="btn sm ghost" title="Edit" data-act="edit" data-id="${esc(o.id)}">${ICON.edit}</button>
                  <button class="btn sm danger ghost" title="Delete" data-act="del" data-id="${esc(o.id)}">${ICON.trash}</button>
                </div>
              </div>
            </div>
          </div>`
        })
        .join('')
    }

    el.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => openOfferForm()))
    $('#offer-new')?.addEventListener('click', () => openOfferForm())
    grid.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id
        if (b.dataset.act === 'edit') openOfferForm(id)
        else if (b.dataset.act === 'toggle') toggleOffer(id)
        else if (b.dataset.act === 'del') deleteOffer(id)
      })
    )
  }

  /* ================= toggle + delete ================= */

  async function toggleOffer(id) {
    const o = (await api('/offers')).find((x) => String(x.id) === String(id))
    if (!o) return
    try {
      await api('/offers/' + id, { method: 'PUT', body: JSON.stringify({ active: !o.active }) })
      toast(o.active ? 'Offer paused' : 'Offer is now live')
      renderOffers()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  function deleteOffer(id) {
    openModal(
      `
      <div class="modal-head"><h2>Delete offer?</h2><button class="x" data-close>×</button></div>
      <div class="modal-body">
        <p style="margin:0;color:var(--muted)">This offer will be removed and will no longer show on the storefront.</p>
      </div>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn danger" id="offer-del-go">Delete</button>
      </div>`,
      { small: true }
    )
    bindModalClose()
    $('#offer-del-go').addEventListener('click', async () => {
      try {
        await api('/offers/' + id, { method: 'DELETE' })
        toast('Offer deleted')
        closeModal()
        renderOffers()
      } catch (e) {
        toast(e.message, 'err')
      }
    })
  }

  /* ================= form ================= */

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Could not read the image'))
      reader.onload = () => {
        const img = new Image()
        img.onerror = () => reject(new Error('Not a valid image file'))
        img.onload = () => {
          const MAX = 640
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function openOfferForm(id) {
    let o = { active: true, discount_pct: 0 }
    if (id) o = await api('/offers/' + id)
    const isNew = !id
    const products = await api('/products?limit=500')
    const productRows = Array.isArray(products) ? products : products.items || []

    let imageValue = o.image || ''
    const m = openModal(
      `
      <div class="modal-head"><h2>${isNew ? 'New offer' : 'Edit offer'}</h2><button class="x" data-close>×</button></div>
      <form id="of-form" class="modal-body" novalidate>
        <div class="form-grid">
          <div class="field full">
            <label class="req">Image</label>
            <div class="offer-upload">
              <div class="offer-upload-preview" id="of-preview">${o.image ? `<img src="${o.image}" alt="" />` : '<span>Preview</span>'}</div>
              <div class="offer-upload-actions">
                <label class="btn sm" for="of-file">${ICON.stock} Upload image</label>
                <input type="file" id="of-file" accept="image/*" hidden />
                <div class="hint" id="of-file-hint">PNG / JPG, auto-resized</div>
              </div>
            </div>
          </div>
          <div class="field full">
            <label class="req">Title</label>
            <input class="input" name="title" required value="${esc(o.title || '')}" placeholder="e.g. Brake-day sale" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea class="input" name="description" rows="2" placeholder="What's on offer?">${esc(o.description || '')}</textarea>
          </div>
          <div class="field">
            <label class="req">Discount %</label>
            <input class="input" name="discount_pct" type="number" min="0" max="90" step="1" value="${o.discount_pct || 0}" />
          </div>
          <div class="field">
            <label>Badge</label>
            <select class="input" name="badge">
              <option value="">— none —</option>
              <option value="new" ${o.badge === 'new' ? 'selected' : ''}>New</option>
              <option value="top" ${o.badge === 'top' ? 'selected' : ''}>Best seller</option>
              <option value="sale" ${o.badge === 'sale' ? 'selected' : ''}>On sale</option>
            </select>
          </div>
          <div class="field full">
            <label>Link a product <small>(optional — orders open on the product page)</small></label>
            <select class="input" name="product_id">
              <option value="">— no product (link to shop) —</option>
              ${productRows
                .map((p) => `<option value="${esc(p.id)}" ${p.id === o.product_id ? 'selected' : ''}>${esc(p.name)} · ${money(p.price)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label>Start date <small>(optional)</small></label>
            <input class="input" name="starts_at" type="date" value="${o.starts_at ? String(o.starts_at).slice(0, 10) : ''}" />
          </div>
          <div class="field">
            <label>Valid until</label>
            <input class="input" name="ends_at" type="date" value="${o.ends_at ? String(o.ends_at).slice(0, 10) : ''}" />
          </div>
          <div class="field">
            <label>Order</label>
            <input class="input" name="sort_order" type="number" step="1" value="${o.sort_order || 0}" title="Lower numbers show first" />
          </div>
          <div class="field">
            <label>Status</label>
            <label class="check-row"><input type="checkbox" name="active" ${o.active ? 'checked' : ''} /> Live on storefront</label>
          </div>
        </div>
      </form>
      <div class="modal-foot">
        <button class="btn" data-close>Cancel</button>
        <button class="btn primary" id="of-save">${isNew ? 'Create offer' : 'Save changes'}</button>
      </div>`,
      { wide: true }
    )
    bindModalClose()

    const $file = $('#of-file', m)
    const $preview = $('#of-preview', m)
    $file.addEventListener('change', async () => {
      const file = $file.files && $file.files[0]
      if (!file) return
      try {
        imageValue = await readImage(file)
        $preview.innerHTML = `<img src="${imageValue}" alt="" />`
        $('#of-file-hint', m).textContent = 'Image ready ✓'
      } catch (e) {
        toast(e.message, 'err')
      }
    })

    $('#of-save', m).addEventListener('click', () => submitOfferForm(id, m, () => imageValue))
  }

  async function submitOfferForm(id, m, getImage) {
    const f = $('#of-form', m)
    if (!f.reportValidity()) return
    const fd = new FormData(f)
    const body = {
      title: fd.get('title'),
      description: fd.get('description'),
      discount_pct: Number(fd.get('discount_pct')) || 0,
      badge: fd.get('badge'),
      product_id: fd.get('product_id'),
      sort_order: Number(fd.get('sort_order')) || 0,
      active: !!fd.get('active'),
      starts_at: fd.get('starts_at') ? new Date(fd.get('starts_at') + 'T00:00:00').toISOString() : '',
      ends_at: fd.get('ends_at') ? new Date(fd.get('ends_at') + 'T23:59:59').toISOString() : '',
    }
    const image = getImage()
    if (!image) return toast('Please upload an offer image', 'err')
    body.image = image
    try {
      if (id) {
        await api('/offers/' + id, { method: 'PUT', body: JSON.stringify(body) })
        toast('Offer updated')
      } else {
        await api('/offers', { method: 'POST', body: JSON.stringify(body) })
        toast('Offer created')
      }
      closeModal()
      renderOffers()
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  window.MS.renderOffers = renderOffers
  window.MS.openOfferForm = openOfferForm
})()
