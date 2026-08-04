import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

export function AdminLoginPage() {
  const { signInAsAdmin } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      await signInAsAdmin(String(values.get('email') || ''), String(values.get('password') || ''))
      navigate('/manage-cotton-candy', { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="admin-login-page"><section className="admin-login-card"><Link className="brand" to="/"><span className="brand-mark">C</span><span>Cotton<br /><em>Candy</em><b>ADMIN</b></span></Link><div><p className="eyebrow">Private access</p><h1>Welcome <em>back.</em></h1><p>Sign in to manage your bookings, messages, store collection and gallery.</p></div><form className="admin-login-form" onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="username" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Your password" /></label><button className="button button-dark" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'} <span>↗</span></button>{error ? <p className="form-error">{error}</p> : null}</form></section></main>
}
