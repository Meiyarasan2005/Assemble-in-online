/* Mei Spare · Inventory Admin — user accounts */
;(function () {
  'use strict'

  const { $, $$, ICON, state, api, esc, fmtDate, toast, openModal, closeModal, bindModalClose } = window.MS

  async function renderUsers() {
    const users = await api('/users')
    let el = $('#view-users')
    if (!el) return

    el.innerHTML = `
      <div class="status-line">${users.length} admin account${users.length === 1 ? '' : 's'}</div>
      <div class="panel">
        <div class="panel-head"><h2>Users</h2><button class="btn sm" id="user-add">＋ Add user</button></div>
        <div class="panel-body" id="user-list"></div>
      </div>`

    const list = $('#user-list', el)
    if (!users.length) {
      list.innerHTML = '<div class="empty">No users yet.</div>'
    } else {
      list.innerHTML = users
        .map(
          (u) => `
        <div class="list-row">
          <div class="info">
            <strong>${esc(u.username)}</strong>
            <span>${u.username === state.username ? 'you · ' : ''}created ${fmtDate(u.created_at)}</span>
          </div>
          <div class="actions">
            <button class="btn sm danger ghost" data-del-user="${u.id}" title="Delete user">${ICON.trash}</button>
          </div>
        </div>`
        )
        .join('')
    }

    $('#user-add', el).addEventListener('click', () => {
      openModal(
        `
        <div class="modal-head"><h2>New user</h2><button class="x" data-close>×</button></div>
        <div class="modal-body">
          <div class="field"><label class="req">Username</label><input class="input" id="user-name" autocomplete="off" /></div>
          <div class="field"><label class="req">Password</label><input class="input" id="user-pass" type="password" autocomplete="new-password" /></div>
          <div class="field"><label class="req">Confirm password</label><input class="input" id="user-pass2" type="password" autocomplete="new-password" /></div>
          <div class="hint" id="user-hint"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-close>Cancel</button>
          <button class="btn primary" id="user-save">Create</button>
        </div>`,
        { small: true }
      )
      bindModalClose()
      const go = async () => {
        const name = $('#user-name').value.trim()
        const pass = $('#user-pass').value
        const pass2 = $('#user-pass2').value
        if (!name || !pass) return
        if (pass !== pass2) {
          $('#user-hint').textContent = 'Passwords do not match.'
          return
        }
        try {
          await api('/users', { method: 'POST', body: JSON.stringify({ username: name, password: pass }) })
          toast('User created')
          closeModal()
          renderUsers()
        } catch (e) {
          $('#user-hint').textContent = e.message
        }
      }
      $('#user-save').addEventListener('click', go)
      $('#user-pass2').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') go()
      })
      setTimeout(() => $('#user-name').focus(), 60)
    })

    $$('#user-list [data-del-user]', el).forEach((b) =>
      b.addEventListener('click', async () => {
        const u = users.find((x) => String(x.id) === b.dataset.delUser)
        if (!confirm(`Delete user "${u.username}"?`)) return
        try {
          await api('/users/' + u.id, { method: 'DELETE' })
          toast('User deleted')
          renderUsers()
        } catch (e) {
          toast(e.message, 'err')
        }
      })
    )
  }

  window.MS.renderUsers = renderUsers
})()
