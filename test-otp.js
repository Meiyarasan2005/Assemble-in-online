const BASE = 'http://localhost:4000/api/store'

async function test() {
  const email = `debug${Date.now()}@gmail.com`
  console.log('Email:', email)

  // 1. Send OTP
  const r1 = await fetch(`${BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const d1 = await r1.json()
  console.log('1. send-otp:', JSON.stringify(d1))
  if (!d1.otp) { console.log('FAIL: no OTP'); return }

  // 2. Verify OTP
  const r2 = await fetch(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp: d1.otp }),
  })
  const d2 = await r2.json()
  console.log('2. verify-otp:', r2.status, JSON.stringify(d2))

  // 3. Register
  const r3 = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Debug User', email, phone: '9876543210', password: 'pass123' }),
  })
  const d3 = await r3.json()
  console.log('3. register:', r3.status, JSON.stringify(d3))
}

test().catch(console.error)
