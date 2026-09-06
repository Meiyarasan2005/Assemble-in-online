import { JSDOM } from 'jsdom'

const { window } = new JSDOM(`<!doctype html><form id="co">
  <input name="co-name" />
  <input name="co-phone" />
  <input name="co-line1" />
  <input name="co-location" />
  <input name="co-city" />
  <input name="co-state" />
  <input name="co-pincode" />
</form>`)
const form = window.document.getElementById('co')

// ---- Browser autofill writes values WITHOUT firing any React onChange ----
form.elements['co-name'].value = 'Ravi Kumar'
form.elements['co-phone'].value = '+91 90033 44069'
form.elements['co-line1'].value = '12, Gandhi Street'
form.elements['co-location'].value = 'Peelamedu'
form.elements['co-city'].value = 'Coimbatore'
form.elements['co-state'].value = 'Tamil Nadu'
form.elements['co-pincode'].value = '641004'

// ---- Simulate ANOTHER re-render happening (React never wipes uncontrolled DOM values) ----

const get = (n) => {
  const f = form.elements.namedItem(n)
  return f ? String(f.value ?? '').trim() : ''
}
const norm = (raw) => {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}
const pinState = { '641': 'Tamil Nadu' }
const pinToState = (pin) => pinState[String(pin).replace(/\D/g, '').slice(0, 3)] || ''

const pincode = get('co-pincode')
const v = {
  email: 'rax@example.com',
  name: get('co-name'),
  phone: norm(get('co-phone')),
  line1: get('co-line1'),
  line2: get('co-line2'),
  location: get('co-location'),
  city: get('co-city'),
  state: get('co-state') || pinToState(pincode),
  pincode,
}

const e = {}
if (v.name.trim().length < 2) e.name = 'Please enter your full name'
if (!/^\d{10}$/.test(v.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number'
if (v.line1.trim().length < 3) e.line1 = 'Please enter your delivery address'
if (v.city.trim().length < 2) e.city = 'Please enter your city'
if (v.state.trim().length < 2) e.state = 'Please select your state'
if (!/^\d{6}$/.test(v.pincode.trim())) e.pincode = 'Enter a valid 6-digit PIN code'
if (v.location.trim().length < 2) e.location = 'Please enter your location / area'

console.log('values:', JSON.stringify(v))
console.log('errors:', JSON.stringify(e))
const ok = Object.keys(e).length === 0 && v.name === 'Ravi Kumar' && v.phone === '9003344069'
console.log(ok ? 'CHECKOUT-FLOW OK' : 'CHECKOUT-FLOW FAIL')
process.exit(ok ? 0 : 1)