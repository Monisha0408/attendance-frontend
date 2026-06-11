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

const EMPTY_FORM = {
  calls_assigned: '',
  calls_closed: '',
  calls_hold: '',
  calls_next_day: '',
  daily_update: '',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation()
  const stored = localStorage.getItem('user')
  const resolvedUser = user || (stored ? JSON.parse(stored) : null)

  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())
  const [showCheckout, setShowCheckout] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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
      setPageLoading(false)
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

  const validate = () => {
    const errs: Record<string, string> = {}
    // calls_assigned and calls_closed are required and must be >= 0
    if (form.calls_assigned === '') errs.calls_assigned = 'Required'
    if (form.calls_closed === '') errs.calls_closed = 'Required'
    // ✅ calls_hold and calls_next_day can be zero — still required to be filled (even 0)
    if (form.calls_hold === '') errs.calls_hold = 'Required (enter 0 if none)'
    if (form.calls_next_day === '') errs.calls_next_day = 'Required (enter 0 if none)'
    if (!form.daily_update.trim()) errs.daily_update = 'Required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setActionLoading(true)
    setError('')
    setMessage('')
    const geo = await getPosition()
    try {
      const { data } = await api.post('/attendance/checkout', {
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        location_name: geo?.location_name ?? null,
        calls_assigned: Number(form.calls_assigned),
        calls_closed: Number(form.calls_closed),
        calls_hold: Number(form.calls_hold),
        calls_next_day: Number(form.calls_next_day),
        daily_update: form.daily_update.trim(),
      })
      setRecord(data)
      setShowCheckout(false)
      setForm(EMPTY_FORM)
      setFormErrors({})
      setMessage('Checked out successfully!')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Check-out failed')
    } finally {
      setActionLoading(false)
    }
  }

  const setField = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setFormErrors(f => { const n = { ...f }; delete n[k]; return n })
  }

  const checkedIn = !!record?.checkin_time
  const checkedOut = !!record?.checkout_time

  // ✅ Dynamic placeholder — reminds about hold/next day reason
  const getPlaceholder = () => {
    const hold = Number(form.calls_hold) || 0
    const next = Number(form.calls_next_day) || 0
    let placeholder = 'Describe the key activities and updates for today…'
    const extras = []
    if (hold > 0) extras.push(`reason for ${hold} call${hold > 1 ? 's' : ''} on hold`)
    if (next > 0) extras.push(`reason for ${next} call${next > 1 ? 's' : ''} shifted to next day`)
    if (extras.length > 0) {
      placeholder = `Describe today's activities. Include ${extras.join(' and ')}.`
    }
    return placeholder
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">{getGreeting()}, {resolvedUser?.name?.split(' ')[0]}</div>
        <div className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {geoError && <div className="alert alert-info">{geoError}</div>}

      {/* Check-in / out card */}
      <div style={{
        background: '#16213E', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          {format(time, 'HH:mm:ss')}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: '1.25rem' }}>
          {format(time, 'EEEE, MMM d')}
        </div>

        {!pageLoading && !checkedIn && (
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

        {/* ✅ After checkin, not checked out, form not open yet */}
        {!pageLoading && checkedIn && !checkedOut && !showCheckout && (
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

        {/* ✅ Already checked out — show times */}
        {!pageLoading && checkedIn && checkedOut && (
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

      {/* ✅ Checkout form — shown below the card, not replacing it */}
      {showCheckout && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.3)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Daily update — required to check out
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Fill in today's call statistics. Enter 0 for calls on hold or shifted to next day if none.
          </div>

          <form onSubmit={handleCheckout}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

              {/* Calls assigned */}
              <div>
                <label className="form-label">Calls assigned <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="number" min="0"
                  value={form.calls_assigned}
                  onChange={e => setField('calls_assigned', e.target.value)}
                  placeholder="0"
                  style={formErrors.calls_assigned ? { borderColor: 'var(--danger)' } : {}} />
                {formErrors.calls_assigned && <div className="form-error">{formErrors.calls_assigned}</div>}
              </div>

              {/* Calls closed */}
              <div>
                <label className="form-label">Calls closed <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-input" type="number" min="0"
                  value={form.calls_closed}
                  onChange={e => setField('calls_closed', e.target.value)}
                  placeholder="0"
                  style={formErrors.calls_closed ? { borderColor: 'var(--danger)' } : {}} />
                {formErrors.calls_closed && <div className="form-error">{formErrors.calls_closed}</div>}
              </div>

              {/* Calls on hold — can be 0 */}
              <div>
                <label className="form-label">
                  Calls on hold <span style={{ color: 'var(--danger)' }}>*</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}> (0 if none)</span>
                </label>
                <input className="form-input" type="number" min="0"
                  value={form.calls_hold}
                  onChange={e => setField('calls_hold', e.target.value)}
                  placeholder="0"
                  style={formErrors.calls_hold ? { borderColor: 'var(--danger)' } : {}} />
                {formErrors.calls_hold && <div className="form-error">{formErrors.calls_hold}</div>}
              </div>

              {/* Shifted to next day — can be 0 */}
              <div>
                <label className="form-label">
                  Shifted to next day <span style={{ color: 'var(--danger)' }}>*</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}> (0 if none)</span>
                </label>
                <input className="form-input" type="number" min="0"
                  value={form.calls_next_day}
                  onChange={e => setField('calls_next_day', e.target.value)}
                  placeholder="0"
                  style={formErrors.calls_next_day ? { borderColor: 'var(--danger)' } : {}} />
                {formErrors.calls_next_day && <div className="form-error">{formErrors.calls_next_day}</div>}
              </div>

            </div>

            {/* ✅ Dynamic placeholder shows hold/next day reason reminder */}
            <div className="form-group">
              <label className="form-label">
                Major update / summary <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              {(Number(form.calls_hold) > 0 || Number(form.calls_next_day) > 0) && (
                <div style={{ fontSize: '0.78rem', color: 'var(--warning)', background: 'var(--warning-bg)', padding: '0.4rem 0.75rem', borderRadius: 6, marginBottom: 6 }}>
                  ⚠ You have {Number(form.calls_hold) > 0 ? `${form.calls_hold} call(s) on hold` : ''}{Number(form.calls_hold) > 0 && Number(form.calls_next_day) > 0 ? ' and ' : ''}{Number(form.calls_next_day) > 0 ? `${form.calls_next_day} call(s) shifted to next day` : ''} — please include the reason in your summary below.
                </div>
              )}
              <textarea
                className="form-input"
                rows={4}
                value={form.daily_update}
                onChange={e => setField('daily_update', e.target.value)}
                placeholder={getPlaceholder()}
                style={{ resize: 'vertical', ...(formErrors.daily_update ? { borderColor: 'var(--danger)' } : {}) }}
              />
              {formErrors.daily_update && <div className="form-error">{formErrors.daily_update}</div>}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn"
                onClick={() => { setShowCheckout(false); setFormErrors({}) }}>
                Cancel
              </button>
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
              {!record
                ? <span className="badge badge-absent">Not checked in</span>
                : record.status === 'present'
                  ? <span className="badge badge-present">Present</span>
                  : record.status === 'halfday'
                    ? <span className="badge badge-halfday">Half day</span>
                    : <span className="badge badge-absent">Absent</span>}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Work mode</div>
            <div style={{ marginTop: 4 }}>
              {record
                ? <span className={`badge badge-${record.work_mode}`}>{record.work_mode === 'wfh' ? 'WFH' : 'Office'}</span>
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-in</div>
            <div style={{ marginTop: 2, fontWeight: 600 }}>
              {record?.checkin_time ? format(new Date(record.checkin_time), 'hh:mm a') : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-out</div>
            <div style={{ marginTop: 2, fontWeight: 600 }}>
              {record?.checkout_time ? format(new Date(record.checkout_time), 'hh:mm a') : '—'}
            </div>
          </div>
        </div>

        {/* Call stats — shown only after checkout */}
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
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>
                    {value !== null && value !== undefined ? value : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {record.daily_update && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.75rem', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Major update
                </div>
                {record.daily_update}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
