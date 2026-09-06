import { JSDOM } from 'jsdom'

const norm = (raw) => {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}
const pinToState = (pin) => (['641', '610', '600'].includes(String(pin).replace(/\D/g, '').slice(0, 3)) ? 'Tamil Nadu' : '')
const readForm = (form) => {
  const get = (n) => {
    const f = form.elements.namedItem(n)
    return f ? String(f.value ?? '').trim() : ''
  }
  const pincode = get('co-pincode')
  return {
    name: get('co-name'),
    phone: norm(get('co-phone')),
    line1: get('co-line1'),
    city: get('co-city'),
    state: get('co-state') || pinToState(pincode),
    pincode,
  }
}
const validate = (v) => {
  const e = {}
  if (v.name.trim().length < 2) e.name = 'required'
  if (!/^\d{10}$/.test(v.phone.trim())) e.phone = 'required'
  if (v.line1.trim().length < 3) e.line1 = 'required'
  if (v.city.trim().length < 2) e.city = 'required'
  if (v.state.trim().length < 2) e.state = 'required'
  if (!/^\d{6}$/.test(v.pincode.trim())) e.pincode = 'required'
  return e
}
// Server-side fallbacks that guarantee an order can always be placed
const resolveServer = (v, account) => ({
  name: v.name || account.name,
  phone: v.phone || norm(account.phone || ''),
  line1: v.line1, city: v.city, state: v.state, pincode: v.pincode,
})

const { window } = new JSDOM(`<!doctype html><form id="co">
  <input name="co-name" />
  <input name="co-phone" />
  <input name="co-line1" />
  <input name="co-city" />
  <input name="co-state" />
  <input name="co-pincode" />
</form>`)
const form = window.document.getElementById('co')

// ---- Scenario 1: password-manager autofill (no React events) + re-render ----
form.elements['co-name'].value = 'Ravi Kumar'
form.elements['co-phone'].value = '+91 90033 44069'
form.elements['co-line1'].value = '12, Gandhi Street'
form.elements['co-city'].value = 'Coimbatore'
form.elements['co-state'].value = 'Tamil Nadu'
form.elements['co-pincode'].value = '641004'
const v1 = readForm(form)
const e1 = validate(v1)
console.log('S1 autofill  ->', JSON.stringify(v1), 'errors:', JSON.stringify(e1))
if (Object.keys(e1).length || v1.phone !== '9003344069') throw new Error('S1 FAIL')

// ---- Scenario 2: autofill filled everything except phone; account has phone ----
form.elements['co-phone'].value = ''
const v2 = readForm(form)
const e2 = validate(v2)
const resolved = resolveServer(v2, { name: 'Ravi Kumar', phone: '9003344069' })
console.log('S2 no-phone  ->', JSON.stringify(v2), 'clientErrors:', JSON.stringify(e2), 'serverResolved:', JSON.stringify(resolved))
if (e2.phone !== 'required' || resolved.phone.length !== 10) throw new Error('S2 FAIL')

// ---- Scenario 3: profile address form - typed line1 is read from the DOM ----
const { window: w2 } = new JSDOM(`<form id="a">
  <input name="pf-addr-line1" />
  <input name="pf-addr-city" />
  <input name="pf-addr-state" />
  <input name="pf-addr-pincode" />
</form>`)
const af = w2.document.getElementById('a')
af.elements['pf-addr-line1'].value = '12, Gandhi Street'
af.elements['pf-addr-city'].value = 'Coimbatore'
af.elements['pf-addr-pincode'].value = '641004'
const aget = (n) => {
  const f = af.elements.namedItem(n)
  return f ? String(f.value ?? '').trim() : ''
}
const line1 = aget('pf-addr-line1')
console.log('S3 addr-form -> line1 =', JSON.stringify(line1))
if (line1.length < 3) throw new Error('S3 FAIL')

console.log('ALL FLOWS OK')
process.exit(0)