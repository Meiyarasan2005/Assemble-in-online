/* Mei Spare · Inventory Admin — homepage banner slides (image only, goes live) */
;(function () {
  'use strict'

  const { $, toast } = window.MS

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
      <div class="status-line"><b>${slides.length}</b> banner slide${slides.length === 1 ? '' : 's'} — uploaded slides go <b>live</b> on the ${targetName} homepage hero carousel and link to the shop</div>
      <div class="toolbar">
        <label class="btn primary" for="banner-file">＋ Upload banner image</label>
        <input type="file" id="banner-file" accept="image/*" multiple hidden />
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
              <button class="btn sm ghost" title="Move earlier" data-act="left" data-i="${i}">◀</button>
              <button class="btn sm ghost" title="Move later" data-act="right" data-i="${i}">▶</button>
              <button class="btn sm ghost" title="Toggle live" data-act="toggle" data-i="${i}">${s.active !== false ? 'Pause' : 'Live'}</button>
              <button class="btn sm danger ghost" title="Delete" data-act="del" data-i="${i}">×</button>
            </div>
          </div>
        </div>`,
        )
        .join('')
      grid.querySelectorAll('[data-act]').forEach((b) =>
        b.addEventListener('click', async () => {
          const i = Number(b.dataset.i)
          const act = b.dataset.act
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

    $('#banner-file', el).addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || [])
      if (!files.length) return
      const at = Math.max(1, Math.min(Number($('#banner-pos', el)?.value) || slides.length + 1, slides.length + 1))
      try {
        const fresh = []
        for (const file of files) {
          fresh.push({ image: await readBannerImage(file), active: true })
        }
        slides.splice(at - 1, 0, ...fresh)
        slides = await persist(slides, `Banner added as slide ${at} — live on homepage ✓`)
        renderBanners()
      } catch (err) {
        toast(err.message, 'err')
      }
      e.target.value = ''
    })
  }

  window.MS.renderBanners = renderBanners
})()
