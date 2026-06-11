import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import api from '../utils/api'
import { AttendanceRecord } from '../types'
import { format } from 'date-fns'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface DailyUpdateForm {
  calls_assigned: string
  calls_closed: string
  calls_hold: string
  calls_next_day: string
  daily_update: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation()
  const stored = localStorage.getItem('user')
  const resolvedUser = user || (stored ? JSON.parse(stored) : null)

  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())
  const [showCheckout, setShowCheckout] = useState(false)
  const [dailyForm, setDailyForm] = useState<DailyUpdateForm>({
    calls_assigned: '', calls_closed: '', calls_hold: '', calls_next_day: '', daily_update: ''
  })
  const [formErrors, setFormErrors] = useState<Partial<DailyUpdateForm>>({})

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { fetchToday() }, [])

  const fetchToday = async () => {
    try {
      const { data } = await api.get('/attendance/today')
      setRecord(data)
    } catch (e: any) {
      if (e.response?.status !== 404) setError('Failed to load today\'s record')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async () => {
    setActionLoading(true)
    setError('')
    setMessage('')
    const geo = await getPosition()
    try {
      const { data } = await api.post('/attendance/checkin', {
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        location_name: geo?.location_name ?? null,
        work_mode: workMode,
      })
      setRecord(data)
      setMessage('Checked in successfully!')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Check-in failed')
    } finally {
      setActionLoading(false)
    }
  }

  const validateDailyForm = (): boolean => {
    const errors: Partial<DailyUpdateForm> = {}
    if (dailyForm.calls_assigned === '') errors.calls_assigned = 'Required'
    if (dailyForm.calls_closed === '') errors.calls_closed = 'Required'
    if (dailyForm.calls_hold === '') errors.calls_hold = 'Required'
    if (dailyForm.calls_next_day === '') errors.calls_next_day = 'Required'
    if (!dailyForm.daily_update.trim()) errors.daily_update = 'Required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDailyForm()) return
    setActionLoading(true)
    setError('')
    setMessage('')
    const geo = await getPosition()
    try {
      const { data } = await api.post('/attendance/checkout', {
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        location_name: geo?.location_name ?? null,
        calls_assigned: parseInt(dailyForm.calls_assigned),
        calls_closed: parseInt(dailyForm.calls_closed),
        calls_hold: parseInt(dailyForm.calls_hold),
        calls_next_day: parseInt(dailyForm.calls_next_day),
        daily_update: dailyForm.daily_update.trim(),
      })
      setRecord(data)
      setShowCheckout(false)
      setMessage('Checked out successfully!')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Check-out failed')
    } finally {
      setActionLoading(false)
    }
  }

  const setField = (k: keyof DailyUpdateForm, v: string) => {
    setDailyForm(f => ({ ...f, [k]: v }))
    setFormErrors(f => ({ ...f, [k]: undefined }))
  }

  const checkedIn = !!record?.checkin_time
  const checkedOut = !!record?.checkout_time

  const inputStyle = (hasError?: string) => ({
    width: '100%', padding: '0.5rem 0.75rem',
    border: `1px solid ${hasError ? 'var(--danger)' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: 7, fontSize: '0.875rem', color: '#EEF2FF',
    background: 'rgba(255,255,255,0.07)', outline: 'none',
    boxSizing: 'border-box' as const
  })

  return (
    <>
      <div className="page-header">
        <div className="page-title">{getGreeting()}, {resolvedUser?.name?.split(' ')[0]}</div>
        <div className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {geoError && <div className="alert alert-info">{geoError}</div>}

      {/* Check-in card */}
      <div style={{
        background: '#16213E', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />

        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          {format(time, 'HH:mm:ss')}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: '1.25rem' }}>
          {format(time, 'EEEE, MMM d')}
        </div>

        {!loading && !checkedIn && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Work mode:</label>
              <select value={workMode} onChange={e => setWorkMode(e.target.value as 'office' | 'wfh')}
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: '0.85rem' }}>
                <option value="office" style={{ color: '#000' }}>Office</option>
                <option value="wfh" style={{ color: '#000' }}>Work from home</option>
              </select>
            </div>
            <button onClick={handleCheckin} disabled={actionLoading || geoLoading}
              style={{ background: '#fff', color: '#B91C1C', border: 'none', borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
              {actionLoading ? 'Checking in…' : '✓ Check in'}
            </button>
          </>
        )}

        {!loading && checkedIn && !checkedOut && !showCheckout && (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem' }}>
              Checked in at {format(new Date(record!.checkin_time!), 'hh:mm a')} · {record?.work_mode === 'wfh' ? 'WFH' : 'Office'}
            </div>
            <button onClick={() => setShowCheckout(true)}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
              ✓ Check out
            </button>
          </div>
        )}

        {!loading && checkedIn && checkedOut && (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.5rem' }}>
              In: {format(new Date(record!.checkin_time!), 'hh:mm a')} · Out: {format(new Date(record!.checkout_time!), 'hh:mm a')}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', padding: '0.4rem 0.9rem', borderRadius: 6, fontSize: '0.85rem' }}>
              ✓ Done for today
            </div>
          </div>
        )}
      </div>

      {/* ✅ Checkout form — daily update mandatory */}
      {showCheckout && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.3)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Daily update — required to check out</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Fill in today's call statistics and summary before checking out.
          </div>
          <form onSubmit={handleCheckout}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {([
                { key: 'calls_assigned', label: 'Calls assigned' },
                { key: 'calls_closed', label: 'Calls closed' },
                { key: 'calls_hold', label: 'Calls on hold' },
                { key: 'calls_next_day', label: 'Shifted to next day' },
              ] as { key: keyof DailyUpdateForm; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label className="form-label">{label} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={dailyForm[key]}
                    onChange={e => setField(key, e.target.value)}
                    placeholder="0"
                    style={{ borderColor: formErrors[key] ? 'var(--danger)' : '' }}
                  />
                  {formErrors[key] && <div className="form-error">{formErrors[key]}</div>}
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Major update / summary <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                className="form-input"
                rows={3}
                value={dailyForm.daily_update}
                onChange={e => setField('daily_update', e.target.value)}
                placeholder="Describe the key activities and updates for today…"
                style={{ resize: 'vertical', borderColor: formErrors.daily_update ? 'var(--danger)' : '' }}
              />
              {formErrors.daily_update && <div className="form-error">{formErrors.daily_update}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setShowCheckout(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading || geoLoading}>
                {actionLoading ? 'Checking out…' : '✓ Confirm checkout'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Today's summary */}
      <div className="card">
        <div className="card-title">Today's summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
          <div>
            <div className="text-muted text-sm">Status</div>
            <div style={{ marginTop: 4 }}>
              {!record ? <span className="badge badge-absent">Not checked in</span>
                : record.status === 'present' ? <span className="badge badge-present">Present</span>
                  : record.status === 'halfday' ? <span className="badge badge-halfday">Half day</span>
                    : <span className="badge badge-absent">Absent</span>}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Work mode</div>
            <div style={{ marginTop: 4 }}>
              {record ? <span className={`badge badge-${record.work_mode}`}>{record.work_mode === 'wfh' ? 'WFH' : 'Office'}</span> : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-in</div>
            <div style={{ marginTop: 2, fontWeight: 600 }}>{record?.checkin_time ? format(new Date(record.checkin_time), 'hh:mm a') : '—'}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-out</div>
            <div style={{ marginTop: 2, fontWeight: 600 }}>{record?.checkout_time ? format(new Date(record.checkout_time), 'hh:mm a') : '—'}</div>
          </div>
        </div>

        {record?.checkout_time && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Today's call stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {[
                { label: 'Assigned', value: record.calls_assigned, color: 'var(--info)' },
                { label: 'Closed', value: record.calls_closed, color: 'var(--success)' },
                { label: 'On hold', value: record.calls_hold, color: 'var(--warning)' },
                { label: 'Next day', value: record.calls_next_day, color: 'var(--danger)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value ?? '—'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {record.daily_update && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.75rem', border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>MAJOR UPDATE</div>
                {record.daily_update}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
