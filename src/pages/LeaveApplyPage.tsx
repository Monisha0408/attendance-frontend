import React, { useState } from 'react'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'

export default function LeaveApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/leave/apply', form)
      navigate('/leave/history', { state: { success: 'Leave request submitted.' } })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Apply for leave</div>
        <div className="page-subtitle">Submit a leave request for admin approval</div>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Leave type</label>
            <select className="form-input form-select" value={form.leave_type} onChange={e => set('leave_type', e.target.value)}>
              <option value="casual">Casual leave</option>
              <option value="sick">Sick leave</option>
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
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={e => set('reason', e.target.value)} required style={{ resize: 'vertical' }} placeholder="Briefly describe the reason for leave" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
