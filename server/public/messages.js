/* Mei Spare · Inventory Admin — contact form inbox */
;(function () {
  'use strict'

  const { $, esc, toast, api, openModal, closeModal, bindModalClose } = window.MS

  function fmtWhen(iso) {
    try {
      return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    } catch {
      return String(iso || '')
    }
  }

  async function renderMessages() {
    const el = $('#view-messages')
    if (!el) return
    let items = []
    try {
      const data = await api('/messages?limit=200')
      items = data.items || []
    } catch (e) {
      if (e.message !== 'AUTH_REQUIRED') toast(e.message, 'err')
      return
    }

    el.innerHTML = `
      <div class="status-line"><b>${items.length}</b> enquir${items.length === 1 ? 'y' : 'ies'} — every contact-form message lands here, newest first</div>
      <div id="msg-list" class="msg-list"></div>`

    const list = $('#msg-list', el)
    if (!items.length) {
      list.innerHTML = `<div class="panel"><div class="empty"><p>No enquiries yet.</p></div></div>`
      return
    }
    list.innerHTML = items
      .map(
        (m) => `
      <div class="panel msg-card">
        <div class="msg-head">
          <div>
            <div class="msg-name">${esc(m.name || '—')}</div>
            <div class="msg-sub">${esc(m.email || '')} · ${fmtWhen(m.created_at)}</div>
          </div>
          <span class="tag ${m.emailed ? 'stock-in' : 'low'}">${m.emailed ? 'Emailed ✓' : 'Saved only'}</span>
        </div>
        <div class="msg-subject">${esc(m.subject || 'Enquiry')}</div>
        <div class="msg-body">${esc(m.message || '')}</div>
        <div class="msg-foot">
          <a class="btn sm" href="mailto:${esc(m.email || '')}">Reply by email</a>
          <button class="btn sm danger ghost" data-del="${esc(m._id)}">Delete</button>
        </div>
      </div>`,
      )
      .join('')

    list.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        openModal(
          `<div class="modal-head"><h2>Delete this enquiry?</h2><button class="x" data-close>×</button></div>
           <div class="modal-foot">
             <button class="btn" data-close>Cancel</button>
             <button class="btn danger" id="msg-del-go">Delete</button>
           </div>`,
          { small: true },
        )
        bindModalClose()
        $('#msg-del-go').addEventListener('click', async () => {
          try {
            await api('/messages/' + encodeURIComponent(b.dataset.del), { method: 'DELETE' })
            toast('Deleted')
            closeModal()
            renderMessages()
          } catch (e) {
            toast(e.message, 'err')
          }
        })
      }),
    )
  }

  window.MS.renderMessages = renderMessages
})()
