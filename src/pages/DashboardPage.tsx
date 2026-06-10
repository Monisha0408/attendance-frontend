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

export default function DashboardPage() {
  const { user } = useAuth()
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation()
  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())

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

  const handleCheckout = async () => {
    setActionLoading(true)
    setError('')
    setMessage('')
    const geo = await getPosition()
    try {
      const { data } = await api.post('/attendance/checkout', {
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        location_name: geo?.location_name ?? null,
      })
      setRecord(data)
      setMessage('Checked out. Have a great rest of your day!')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Check-out failed')
    } finally {
      setActionLoading(false)
    }
  }

  const checkedIn = !!record?.checkin_time
  const checkedOut = !!record?.checkout_time

  return (
    <>
      <div className="page-header">
        <div className="page-title">{getGreeting()}, {user?.name?.split(' ')[0]}</div>
        <div className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {geoError && <div className="alert alert-info">{geoError}</div>}

      {/* Check-in card — navy with clearly visible white button */}
      <div style={{
        background: '#16213E',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 12,
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />

        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          {format(time, 'HH:mm:ss')}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: '1.25rem' }}>
          {format(time, 'EEEE, MMM d')}
        </div>

        {!loading && (
          <>
            {!checkedIn && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Work mode:</label>
                  <select
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value as 'office' | 'wfh')}
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="office" style={{ color: '#000' }}>Office</option>
                    <option value="wfh" style={{ color: '#000' }}>Work from home</option>
                  </select>
                </div>
                {/* WHITE button — clearly visible on dark navy */}
                <button
                  onClick={handleCheckin}
                  disabled={actionLoading || geoLoading}
                  style={{ background: '#fff', color: '#B91C1C', border: 'none', borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Checking in…' : '✓ Check in'}
                </button>
              </>
            )}

            {checkedIn && !checkedOut && (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem' }}>
                  Checked in at {format(new Date(record!.checkin_time!), 'hh:mm a')}
                  {' · '}<span style={{ textTransform: 'capitalize' }}>{record?.work_mode}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={actionLoading || geoLoading}
                  style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Checking out…' : '✓ Check out'}
                </button>
              </div>
            )}

            {checkedIn && checkedOut && (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.5rem' }}>
                  In: {format(new Date(record!.checkin_time!), 'hh:mm a')} &nbsp;·&nbsp;
                  Out: {format(new Date(record!.checkout_time!), 'hh:mm a')}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', padding: '0.4rem 0.9rem', borderRadius: 6, fontSize: '0.85rem' }}>
                  ✓ Done for today
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
              {record ? <span className={`badge badge-${record.work_mode}`} style={{ textTransform: 'capitalize' }}>{record.work_mode === 'wfh' ? 'WFH' : 'Office'}</span> : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-in</div>
            <div style={{ marginTop: 2, fontWeight: 600, fontSize: '0.9rem' }}>
              {record?.checkin_time ? format(new Date(record.checkin_time), 'hh:mm a') : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-out</div>
            <div style={{ marginTop: 2, fontWeight: 600, fontSize: '0.9rem' }}>
              {record?.checkout_time ? format(new Date(record.checkout_time), 'hh:mm a') : '—'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
