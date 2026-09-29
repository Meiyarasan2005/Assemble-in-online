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
          ${m.replied ? '<span class="tag stock-in">Replied ✓</span>' : ''}
          <button class="btn sm primary" data-reply="${esc(m._id)}" data-name="${esc(m.name || '')}" data-email="${esc(m.email || '')}">Reply</button>
          <button class="btn sm danger ghost" data-del="${esc(m._id)}">Delete</button>
        </div>
      </div>`,
      )
      .join('')

    list.querySelectorAll('[data-reply]').forEach((b) =>
      b.addEventListener('click', () => openReplyModal(b.dataset.reply, b.dataset.name, b.dataset.email)),
    )

    async function openReplyModal(id, name, email) {
      openModal(
        `<div class="modal-head"><h2>Reply to ${esc(name || 'enquiry')}</h2><button class="x" data-close>×</button></div>
         <div class="modal-body">
           <div class="status-line" style="margin-bottom:10px">To <b>${esc(email || '')}</b> · sent from <b>assembleonlinesupport@gmail.com</b></div>
           <div class="field">
             <label class="req" for="reply-text">Your reply</label>
             <textarea class="input" id="reply-text" rows="6" placeholder="Hi, thanks for reaching out…"></textarea>
           </div>
           <div class="hint" id="reply-hint"></div>
         </div>
         <div class="modal-foot">
           <button class="btn" data-close>Cancel</button>
           <button class="btn primary" id="reply-send">Send reply</button>
         </div>`,
      )
      bindModalClose()
      $('#reply-send').addEventListener('click', async () => {
        const text = $('#reply-text').value.trim()
        if (!text) {
          $('#reply-hint').textContent = 'Please write a reply first.'
          return
        }
        const btn = $('#reply-send')
        btn.disabled = true
        btn.textContent = 'Sending…'
        try {
          const r = await api('/messages/' + encodeURIComponent(id) + '/reply', {
            method: 'POST',
            body: JSON.stringify({ message: text }),
          })
          toast(`Reply sent from ${r.from || 'assembleonlinesupport@gmail.com'} ✓`)
          closeModal()
          renderMessages()
        } catch (e) {
          $('#reply-hint').textContent = e.message
          btn.disabled = false
          btn.textContent = 'Send reply'
        }
      })
    }

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
