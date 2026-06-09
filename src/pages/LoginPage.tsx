import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect email or password.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left panel — brand */}
      <div style={{
        width: '40%', background: 'linear-gradient(160deg, #9B1B1B 0%, #7F1515 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Owl SVG */}
        <svg viewBox="0 0 80 80" width="100" height="100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '1.5rem' }}>
          <path d="M6 37 C10 24, 24 18, 29 26 L24 40 C18 34, 10 34, 6 37Z" fill="#2563EB"/>
          <path d="M74 37 C70 24, 56 18, 51 26 L56 40 C62 34, 70 34, 74 37Z" fill="#2563EB"/>
          <path d="M4 47 C8 32, 22 26, 29 34 L23 48 C17 40, 8 40, 4 47Z" fill="#1D4ED8" opacity="0.7"/>
          <path d="M76 47 C72 32, 58 26, 51 34 L57 48 C63 40, 72 40, 76 47Z" fill="#1D4ED8" opacity="0.7"/>
          <ellipse cx="40" cy="50" rx="18" ry="21" fill="rgba(255,255,255,0.15)"/>
          <circle cx="40" cy="29" r="16" fill="rgba(255,255,255,0.15)"/>
          <path d="M29 17 L26 9 L33 16Z" fill="rgba(255,255,255,0.2)"/>
          <path d="M51 17 L54 9 L47 16Z" fill="rgba(255,255,255,0.2)"/>
          <ellipse cx="40" cy="30" rx="11" ry="9" fill="rgba(255,255,255,0.2)"/>
          <circle cx="35" cy="27" r="4.5" fill="white" opacity="0.9"/>
          <circle cx="45" cy="27" r="4.5" fill="white" opacity="0.9"/>
          <circle cx="35" cy="27" r="2.5" fill="#1a1a1a"/>
          <circle cx="45" cy="27" r="2.5" fill="#1a1a1a"/>
          <circle cx="36" cy="26" r="0.8" fill="white"/>
          <circle cx="46" cy="26" r="0.8" fill="white"/>
          <path d="M37 33 L40 37 L43 33Z" fill="#F97316"/>
        </svg>

        <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, textAlign: 'center', lineHeight: 1.2, marginBottom: 6 }}>
          CB Enterprises
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.5 }}>
          Staff Portal<br/>
          <span style={{ fontSize: '0.75rem' }}>CCTV · Surveillance · Security</span>
        </p>

        <div style={{ marginTop: '2.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', textAlign: 'center' }}>
          Ambattur, Chennai — 53
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Sign in
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            Enter your credentials to access the portal
          </p>

          <div className="card">
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@cbenterprises.in"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Forgot your password? Contact your admin.
          </p>
        </div>
      </div>
    </div>
  )
}
