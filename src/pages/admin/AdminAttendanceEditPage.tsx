import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { AttendanceRecord } from '../../types'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'

export default function AdminAttendanceEditPage() {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    visited_office: null as boolean | null,
    calls_assigned: '', calls_closed: '', calls_hold: '0', calls_next_day: '0',
    daily_update: '',
  })

  useEffect(() => {
    // Can't fetch single record directly, so get from today's admin list
    // We just show the form pre-filled if record has data
    setLoading(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.visited_office === null) { setError('Please select office visit'); return }
    if (!form.daily_update.trim()) { setError('Daily update is required'); return }
    setSaving(true)
    setError('')
    try {
      await api.put(`/attendance/admin/edit/${recordId}`, {
        visited_office: form.visited_office,
        calls_assigned: Number(form.calls_assigned) || 0,
        calls_closed: Number(form.calls_closed) || 0,
        calls_hold: Number(form.calls_hold) || 0,
        calls_next_day: Number(form.calls_next_day) || 0,
        daily_update: form.daily_update.trim(),
        latitude: null, longitude: null, location_name: null,
        spares_from_office: [], spares_from_outside: [], spares_required: [], bill_urls: [],
      })
      setSuccess(true)
      setTimeout(() => navigate('/admin/attendance'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Edit attendance record</div>
        <div className="page-subtitle">Manually set checkout details for an employee</div>
      </div>
      {success && <div className="alert alert-success">Updated successfully! Redirecting…</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card" style={{ maxWidth: 540 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Visited office?</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                <button key={String(opt.value)} type="button"
                  onClick={() => setForm(f => ({ ...f, visited_office: opt.value }))}
                  className={`btn ${form.visited_office === opt.value ? 'btn-primary' : ''}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {[
              { key: 'calls_assigned', label: 'Calls assigned' },
              { key: 'calls_closed', label: 'Calls closed' },
              { key: 'calls_hold', label: 'Calls on hold' },
              { key: 'calls_next_day', label: 'Shifted to next day' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" min="0"
                  value={form[key as keyof typeof form] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="0" />
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Daily update / summary <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea className="form-input" rows={4}
              value={form.daily_update}
              onChange={e => setForm(f => ({ ...f, daily_update: e.target.value }))}
              placeholder="Enter the employee's daily update…"
              style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
