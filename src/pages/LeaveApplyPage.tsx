import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import { LeaveBalance } from '../types'
import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'

export default function LeaveApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [balance, setBalance] = useState<LeaveBalance | null>(null)

  useEffect(() => {
    api.get('/leave/balance').then(r => setBalance(r.data)).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const days = form.from_date && form.to_date
    ? Math.ceil((new Date(form.to_date).getTime() - new Date(form.from_date).getTime()) / 86400000) + 1
    : 0

  const remaining = balance ? (form.leave_type === 'casual' ? balance.casual : balance.sick) : null
  const willExceed = remaining !== null && days > remaining

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.from_date || !form.to_date) { setError('Please select both dates'); return }
    if (new Date(form.to_date) < new Date(form.from_date)) { setError('End date must be after start date'); return }
    setLoading(true); setError('')
    try {
      await api.post('/leave/apply', form)
      setSuccess(true)
      setTimeout(() => navigate('/leave/history'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Apply for leave</div>
        <div className="page-subtitle">Submit a leave request for approval</div>
      </div>

      {/* ✅ Balance cards */}
      {balance && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: '1.25rem' }}>
          <div className="stat-card leave" style={{ cursor: 'pointer', outline: form.leave_type === 'casual' ? '2px solid var(--primary)' : 'none' }}
            onClick={() => set('leave_type', 'casual')}>
            <div className="stat-label">Casual leave remaining</div>
            <div className="stat-value" style={{ color: balance.casual > 3 ? 'var(--success)' : 'var(--danger)' }}>
              {balance.casual} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 12</span>
            </div>
          </div>
          <div className="stat-card leave" style={{ cursor: 'pointer', outline: form.leave_type === 'sick' ? '2px solid var(--primary)' : 'none' }}
            onClick={() => set('leave_type', 'sick')}>
            <div className="stat-label">Sick leave remaining</div>
            <div className="stat-value" style={{ color: balance.sick > 2 ? 'var(--success)' : 'var(--danger)' }}>
              {balance.sick} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 6</span>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 500 }}>
        {success && <div className="alert alert-success">Leave request submitted! Redirecting…</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* ✅ Exceed warning */}
        {willExceed && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} />
            You are applying for {days} day{days > 1 ? 's' : ''} but only have {remaining} {form.leave_type} leave{remaining !== 1 ? 's' : ''} remaining.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Leave type</label>
            <select className="form-input form-select" value={form.leave_type} onChange={e => set('leave_type', e.target.value)}>
              <option value="casual">Casual leave {balance ? `(${balance.casual} remaining)` : ''}</option>
              <option value="sick">Sick leave {balance ? `(${balance.sick} remaining)` : ''}</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">From date</label>
              <input className="form-input" type="date" value={form.from_date} onChange={e => set('from_date', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">To date</label>
              <input className="form-input" type="date" value={form.to_date} min={form.from_date} onChange={e => set('to_date', e.target.value)} required />
            </div>
          </div>
          {days > 0 && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
              {days} day{days > 1 ? 's' : ''} selected
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="Reason for leave…" required style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
