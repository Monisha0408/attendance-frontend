import React, { useState } from 'react'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { KeyRound, ShieldCheck } from 'lucide-react'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const stored = localStorage.getItem('user')
  const resolvedUser = user || (stored ? JSON.parse(stored) : null)
  const isForced = resolvedUser?.must_change_password === true

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match')
      return
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      // ✅ Update the user in context so must_change_password = false
      if (resolvedUser) {
        refreshUser({ ...resolvedUser, must_change_password: false })
      }
      setSuccess(true)
      setTimeout(() => {
        navigate(resolvedUser?.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={isForced ? {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#1C2B4A', padding: '1rem'
    } : {}}>
      <div style={{ width: '100%', maxWidth: isForced ? 460 : undefined }}>

        {isForced && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(59,130,246,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <ShieldCheck size={26} color="#3B82F6" />
            </div>
            <h2 style={{ color: '#EEF2FF', fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>
              Set your password
            </h2>
            <p style={{ color: 'rgba(238,242,255,0.45)', fontSize: '0.85rem' }}>
              Welcome to CB Enterprises Staff Portal.<br />
              Please set a new password before continuing.
            </p>
          </div>
        )}

        {!isForced && (
          <div className="page-header">
            <div className="page-title">Change password</div>
            <div className="page-subtitle">Update your login password</div>
          </div>
        )}

        <div className={isForced ? '' : 'card'} style={isForced ? {
          background: '#223460', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '1.5rem'
        } : { maxWidth: 460 }}>

          {!isForced && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--info-bg)', borderRadius: 8 }}>
              <KeyRound size={16} color="var(--info)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--info)' }}>
                Choose a strong password with at least 8 characters
              </span>
            </div>
          )}

          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#6EE7B7', padding: '0.75rem 1rem', borderRadius: 8,
              fontSize: '0.875rem', marginBottom: '1rem'
            }}>
              <ShieldCheck size={16} />
              Password set successfully! Redirecting…
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)',
              color: isForced ? '#FCA5A5' : 'var(--danger)',
              padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: isForced ? 'rgba(238,242,255,0.65)' : 'var(--text)', marginBottom: '0.4rem' }}>
                {isForced ? 'Generated password (current)' : 'Current password'}
              </label>
              <input
                className={isForced ? '' : 'form-input'}
                type="password"
                value={form.current_password}
                onChange={e => set('current_password', e.target.value)}
                placeholder={isForced ? 'Paste the generated password' : 'Your current password'}
                required
                autoFocus
                style={isForced ? { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.9rem', color: '#EEF2FF', background: 'rgba(255,255,255,0.05)', outline: 'none', boxSizing: 'border-box' as const } : {}}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: isForced ? 'rgba(238,242,255,0.65)' : 'var(--text)', marginBottom: '0.4rem' }}>
                New password
              </label>
              <input
                className={isForced ? '' : 'form-input'}
                type="password"
                value={form.new_password}
                onChange={e => set('new_password', e.target.value)}
                placeholder="At least 8 characters"
                required
                style={isForced ? { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.9rem', color: '#EEF2FF', background: 'rgba(255,255,255,0.05)', outline: 'none', boxSizing: 'border-box' as const } : {}}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: isForced ? 'rgba(238,242,255,0.65)' : 'var(--text)', marginBottom: '0.4rem' }}>
                Confirm new password
              </label>
              <input
                className={isForced ? '' : 'form-input'}
                type="password"
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                placeholder="Repeat new password"
                required
                style={isForced ? { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.9rem', color: '#EEF2FF', background: 'rgba(255,255,255,0.05)', outline: 'none', boxSizing: 'border-box' as const } : {}}
              />
              {form.confirm_password && form.new_password !== form.confirm_password && (
                <div style={{ fontSize: '0.8rem', color: isForced ? '#FCA5A5' : 'var(--danger)', marginTop: 4 }}>
                  Passwords do not match
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: isForced ? 'center' : 'flex-end' }}>
              {!isForced && (
                <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
              )}
              <button
                type="submit"
                disabled={loading || form.new_password !== form.confirm_password}
                style={isForced ? {
                  width: '100%', padding: '0.65rem', background: '#B91C1C', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                } : undefined}
                className={isForced ? '' : 'btn btn-primary'}
              >
                {loading ? 'Saving…' : isForced ? 'Set my password' : 'Change password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
