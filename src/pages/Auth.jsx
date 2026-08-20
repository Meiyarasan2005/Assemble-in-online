import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/useStore'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBox,
  IconCheck,
  IconLock,
  IconShield,
  IconTruck,
  IconUser,
} from '../components/icons'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function Auth() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { isAuthed, customer, signIn, signUp, signOut, showToast } = useStore()

  const next = params.get('next') || '/'
  const initialTab = params.get('tab') === 'register' ? 'register' : 'login'

  const [tab, setTab] = useState(initialTab)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })

  const setLogin = (key) => (e) => setLoginForm((f) => ({ ...f, [key]: e.target.value }))
  const setReg = (key) => (e) => setRegForm((f) => ({ ...f, [key]: e.target.value }))

  const goNext = () => navigate(next)

  const submitLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(loginForm.email.trim())) return setError('Enter a valid email')
    if (loginForm.password.length < 6) return setError('Password must be at least 6 characters')
    setBusy(true)
    try {
      await signIn({ email: loginForm.email.trim(), password: loginForm.password })
      showToast('Welcome back')
      goNext()
    } catch (err) {
      setError(err.message || 'Could not sign in')
      setBusy(false)
    }
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (regForm.name.trim().length < 2) return setError('Full name is required')
    if (!EMAIL_RE.test(regForm.email.trim())) return setError('Enter a valid email')
    if (!/^\d{10}$/.test(regForm.phone.trim())) return setError('Enter a valid 10-digit mobile number')
    if (regForm.password.length < 6) return setError('Password must be at least 6 characters')
    if (regForm.password !== regForm.confirm) return setError('Passwords do not match')
    setBusy(true)
    try {
      await signUp({
        name: regForm.name.trim(),
        email: regForm.email.trim(),
        phone: regForm.phone.trim(),
        password: regForm.password,
      })
      showToast('Account created — welcome to SpareXpress')
      goNext()
    } catch (err) {
      setError(err.message || 'Could not create account')
      setBusy(false)
    }
  }

  const doLogout = async () => {
    try {
      await signOut()
    } catch {
      /* ignore */
    }
    showToast('Signed out')
    navigate('/')
  }

  return (
    <div className="container auth-page">
      <button className="pd-back" onClick={() => navigate(-1)}>
        <IconArrowLeft width="18" height="18" /> Back
      </button>

      {isAuthed && customer ? (
        <div className="account-panel card">
          <div className="account-avatar">
            <IconUser width="30" height="30" />
          </div>
          <h1>Hi, {customer.name.split(' ')[0]}</h1>
          <p className="account-email">{customer.email}</p>
          <p className="account-phone">+91 {customer.phone}</p>
          <div className="account-actions">
            <Link to="/orders" className="btn btn-primary">
              <IconBox width="16" height="16" /> My orders
            </Link>
            <Link to="/profile" className="btn btn-ghost">
              <IconUser width="16" height="16" /> Edit profile
            </Link>
            <Link to="/shop" className="btn btn-ghost">
              Continue shopping
            </Link>
            <button className="btn btn-danger" onClick={doLogout}>
              Log out
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-card card">
          <div className="auth-logo-wrap">
            <img className="auth-logo" src="/favicon.png" alt="SpareXpress" />
          </div>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={`auth-tab ${tab === 'login' ? 'auth-tab-on' : ''}`}
              onClick={() => { setTab('login'); setError('') }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`auth-tab ${tab === 'register' ? 'auth-tab-on' : ''}`}
              onClick={() => { setTab('register'); setError('') }}
            >
              Create account
            </button>
          </div>

          <div className="auth-body">
            {tab === 'login' ? (
              <form className="auth-form" onSubmit={submitLogin}>
                <h2>Log in to your account</h2>
                <p className="auth-lead">
                  You'll need an account to place an order. Browse the catalogue freely until checkout.
                </p>
                <label className="co-field">
                  <span>Email address</span>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={setLogin('email')}
                    autoComplete="email"
                  />
                </label>
                <label className="co-field">
                  <span>Password</span>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={setLogin('password')}
                    autoComplete="current-password"
                  />
                </label>
                {error && <p className="co-error">{error}</p>}
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  {busy ? 'Signing in…' : 'Log in'}
                  {!busy && <IconArrowRight width="16" height="16" />}
                </button>
                <p className="auth-switch">
                  New here?{' '}
                  <button type="button" onClick={() => { setTab('register'); setError('') }}>
                    Create an account
                  </button>
                </p>
              </form>
            ) : (
              <form className="auth-form" onSubmit={submitRegister}>
                <h2>Create your account</h2>
                <p className="auth-lead">
                  Register once and check out faster — your orders and invoices stay in one place.
                </p>
                <label className="co-field">
                  <span>Full name</span>
                  <input className="input" placeholder="Your name" value={regForm.name} onChange={setReg('name')} autoComplete="name" />
                </label>
                <label className="co-field">
                  <span>Email address</span>
                  <input className="input" type="email" placeholder="you@example.com" value={regForm.email} onChange={setReg('email')} autoComplete="email" />
                </label>
                <label className="co-field">
                  <span>Mobile number</span>
                  <input className="input" inputMode="numeric" placeholder="10-digit mobile" value={regForm.phone} onChange={setReg('phone')} autoComplete="tel" />
                </label>
                <label className="co-field">
                  <span>Password</span>
                  <input className="input" type="password" placeholder="At least 6 characters" value={regForm.password} onChange={setReg('password')} autoComplete="new-password" />
                </label>
                <label className="co-field">
                  <span>Confirm password</span>
                  <input className="input" type="password" placeholder="Repeat password" value={regForm.confirm} onChange={setReg('confirm')} autoComplete="new-password" />
                </label>
                {error && <p className="co-error">{error}</p>}
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  {busy ? 'Creating account…' : 'Create account'}
                  {!busy && <IconArrowRight width="16" height="16" />}
                </button>
                <p className="auth-switch">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setTab('login'); setError('') }}>
                    Log in
                  </button>
                </p>
              </form>
            )}

            <div className="auth-perks">
              <span><IconShield width="14" height="14" /> Orders secured to your account</span>
              <span><IconTruck width="14" height="14" /> Track every purchase</span>
              <span><IconLock width="14" height="14" /> Passwords encrypted, never stored in plain text</span>
              <span><IconCheck width="14" height="14" /> No spam — we only email about your orders</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
