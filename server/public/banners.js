/* Mei Spare · Inventory Admin — homepage banner slides (image only, goes live) */
;(function () {
  'use strict'

  const { $, esc, toast } = window.MS

  async function storeApi(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    const token = window.MS.state.token
    if (token) headers['x-admin-token'] = token
    const res = await fetch(window.MS.apiBase() + '/store' + path, { ...opts, headers })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`)
    return data
  }

  function readBannerImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Could not read the image'))
      reader.onload = () => {
        const img = new Image()
        img.onerror = () => reject(new Error('Not a valid image file'))
        img.onload = () => {
          const MAX = 1280
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function loadSlides() {
    try {
      const data = await storeApi('/hero-slides')
      return Array.isArray(data.slides) ? data.slides : []
    } catch {
      return []
    }
  }

  async function persist(slides, msg) {
    const saved = await storeApi('/hero-slides', {
      method: 'PUT',
      body: JSON.stringify({ slides }),
    })
    if (msg) toast(msg)
    return saved.slides || slides
  }

  async function renderBanners() {
    const el = $('#view-banners')
    if (!el) return
    let slides = await loadSlides()

    const targetName = window.MS.state.apiTarget === 'live' ? 'LIVE website' : 'local test site'
    el.innerHTML = `
      <div class="status-line"><b>${slides.length}</b> banner slide${slides.length === 1 ? '' : 's'} — tapping a slide on the ${targetName} homepage opens its linked category or product</div>
      <div class="toolbar">
        <button class="btn primary" id="banner-new">＋ New banner</button>
        <label class="banner-pos-label" for="banner-pos">Add as
          <select class="input" id="banner-pos"></select>
        </label>
        <span class="hint" id="banner-hint">PNG / JPG · wide images look best (e.g. 1600×600)</span>
      </div>
      <div id="banner-grid" class="banner-grid"></div>`

    const grid = $('#banner-grid', el)

    const paintPos = () => {
      const sel = $('#banner-pos', el)
      if (!sel) return
      const keep = sel.value
      let html = ''
      for (let n = 1; n <= slides.length + 1; n++) {
        html += `<option value="${n}" ${String(n) === keep || (!keep && n === slides.length + 1) ? 'selected' : ''}>Slide ${n}${n === slides.length + 1 ? ' (last)' : ''}</option>`
      }
      sel.innerHTML = html
    }
    paintPos()

    const paint = () => {
      paintPos()
      if (!slides.length) {
        grid.innerHTML = `<div class="panel"><div class="empty"><p>No banner slides yet — upload one to replace the default homepage banners.</p></div></div>`
        return
      }
      grid.innerHTML = slides
        .map(
          (s, i) => `
        <div class="banner-card panel">
          <div class="banner-img">
            <span class="banner-num">${i + 1}</span>
            <img src="${s.image}" alt="Banner slide ${i + 1}" />
          </div>
          <div class="banner-foot">
            <span class="tag ${s.active !== false ? 'stock-in' : 'low'}">${s.active !== false ? 'Live' : 'Paused'}</span>
            <span class="banner-pos">Slide ${i + 1} of ${slides.length}</span>
            <div class="cell-actions">
              <button class="btn sm ghost" title="Edit image / link" data-act="edit" data-i="${i}">${window.MS.ICON.edit}</button>
              <button class="btn sm ghost" title="Move earlier" data-act="left" data-i="${i}">◀</button>
              <button class="btn sm ghost" title="Move later" data-act="right" data-i="${i}">▶</button>
              <button class="btn sm ghost" title="Toggle live" data-act="toggle" data-i="${i}">${s.active !== false ? 'Pause' : 'Live'}</button>
              <button class="btn sm danger ghost" title="Delete" data-act="del" data-i="${i}">×</button>
            </div>
          </div>
          <div class="banner-link"><span class="tag brand">→ ${esc(linkLabel(s.link))}</span></div>
        </div>`,
        )
        .join('')
      grid.querySelectorAll('[data-act]').forEach((b) =>
        b.addEventListener('click', async () => {
          const i = Number(b.dataset.i)
          const act = b.dataset.act
          if (act === 'edit') {
            openSlideModal(i)
            return
          }
          try {
            if (act === 'left' && i > 0) {
              ;[slides[i - 1], slides[i]] = [slides[i], slides[i - 1]]
              slides = await persist(slides, 'Order updated — live')
            } else if (act === 'right' && i < slides.length - 1) {
              ;[slides[i + 1], slides[i]] = [slides[i], slides[i + 1]]
              slides = await persist(slides, 'Order updated — live')
            } else if (act === 'toggle') {
              slides[i] = { ...slides[i], active: slides[i].active === false }
              slides = await persist(slides, slides[i].active !== false ? 'Slide is now live' : 'Slide paused')
            } else if (act === 'del') {
              slides.splice(i, 1)
              slides = await persist(slides, 'Slide deleted')
            }
            renderBanners()
          } catch (e) {
            toast(e.message, 'err')
          }
        }),
      )
    }
    paint()

    $('#banner-new', el).addEventListener('click', () => openSlideModal(null))

    async function openSlideModal(index) {
      const isNew = index == null
      const cur = isNew ? { image: '', link: '/shop', active: true } : { ...slides[index] }
      // api() already hits the selected target (local or live); products live under /products there.
      let products = []
      try {
        const data = await window.MS.api('/products?limit=500')
        products = Array.isArray(data) ? data : data.items || []
      } catch {
        products = []
      }
      const cats = window.MS.state.categories || []
      const sel = linkParts(cur.link)
      let imageValue = cur.image || ''

      const m = window.MS.openModal(
        `
        <div class="modal-head"><h2>${isNew ? 'New banner' : `Edit slide ${index + 1}`}</h2><button class="x" data-close>×</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field full">
              <label class="${isNew ? 'req' : ''}">1 · Banner image</label>
              <div class="offer-upload">
                <div class="offer-upload-preview" id="bn-preview" style="width:220px;height:110px">${imageValue ? `<img src="${imageValue}" alt="" />` : '<span>Preview</span>'}</div>
                <div class="offer-upload-actions">
                  <label class="btn sm" for="bn-file">Upload image</label>
                  <input type="file" id="bn-file" accept="image/*" hidden />
                  <div class="hint">PNG / JPG · wide works best</div>
                </div>
              </div>
            </div>
            <div class="field full">
              <label>2 · Category <small>(tap opens this category — optional)</small></label>
              <select class="input" id="bn-cat">
                <option value="">— All / Shop —</option>
                ${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === sel.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="field full">
              <label>3 · Particular product <small>(optional — tap opens this product instead)</small></label>
              <select class="input" id="bn-product">
                <option value="">— None —</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-close>Cancel</button>
          <button class="btn primary" id="bn-save">${isNew ? 'Add banner' : 'Save'}</button>
        </div>`,
        { wide: true },
      )
      window.MS.bindModalClose()

      const $cat = $('#bn-cat', m)
      const $prod = $('#bn-product', m)
      const paintProducts = () => {
        const list = $cat.value ? products.filter((p) => p.category === $cat.value) : products
        $prod.innerHTML =
          '<option value="">— None —</option>' +
          list.map((p) => `<option value="${esc(p.id)}" ${String(p.id) === String(sel.product) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')
      }
      paintProducts()
      $cat.addEventListener('change', () => {
        $prod.value = ''
        paintProducts()
      })

      $('#bn-file', m).addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        try {
          imageValue = await readBannerImage(file)
          $('#bn-preview', m).innerHTML = `<img src="${imageValue}" alt="" />`
        } catch (err) {
          toast(err.message, 'err')
        }
        e.target.value = ''
      })

      $('#bn-save', m).addEventListener('click', async () => {
        if (!imageValue) return toast('Please upload a banner image', 'err')
        const link = $prod.value ? `/product/${$prod.value}` : $cat.value ? `/shop?cat=${$cat.value}` : '/shop'
        try {
          if (isNew) {
            const at = Math.max(1, Math.min(Number($('#banner-pos', el)?.value) || slides.length + 1, slides.length + 1))
            slides.splice(at - 1, 0, { image: imageValue, link, active: true })
            slides = await persist(slides, `Banner added as slide ${at} — live ✓`)
          } else {
            slides[index] = { ...slides[index], image: imageValue, link }
            slides = await persist(slides, 'Banner updated — live ✓')
          }
          window.MS.closeModal()
          renderBanners()
        } catch (err) {
          toast(err.message, 'err')
        }
      })
    }
  }

  function linkParts(link) {
    const out = { cat: '', product: '' }
    if (typeof link !== 'string') return out
    let m = link.match(/^\/shop\?cat=([a-z0-9\-_]+)/i)
    if (m) out.cat = m[1]
    m = link.match(/^\/product\/([a-z0-9\-_]+)/i)
    if (m) out.product = m[1]
    return out
  }

  function linkLabel(link) {
    const { cat, product } = linkParts(link)
    if (product) {
      return `Product ${product}`
    }
    if (cat) {
      const c = (window.MS.state.categories || []).find((x) => x.id === cat)
      return c ? c.name : cat
    }
    return 'Shop'
  }

  window.MS.renderBanners = renderBanners
})()
