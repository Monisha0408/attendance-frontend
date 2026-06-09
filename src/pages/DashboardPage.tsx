import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import api from '../utils/api'
import { AttendanceRecord } from '../types'
import { format } from 'date-fns'
import { MapPin, Clock } from 'lucide-react'

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

  useEffect(() => {
    fetchToday()
  }, [])

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

      <div className="checkin-card">
        <div className="checkin-time">{format(time, 'HH:mm:ss')}</div>
        <div className="checkin-date" style={{ marginTop: 4 }}>{format(time, 'EEEE, MMM d')}</div>

        {!loading && (
          <div style={{ marginTop: '1rem' }}>
            {!checkedIn && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>Work mode:</label>
                  <select
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value as 'office' | 'wfh')}
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="office" style={{ color: '#000' }}>Office</option>
                    <option value="wfh" style={{ color: '#000' }}>Work from home</option>
                  </select>
                </div>
                <div className="checkin-actions">
                  <button className="btn-checkin" onClick={handleCheckin} disabled={actionLoading || geoLoading}>
                    {actionLoading ? 'Checking in…' : '✓ Check in'}
                  </button>
                </div>
              </>
            )}
            {checkedIn && !checkedOut && (
              <div>
                <div className="checkin-status">
                  Checked in at {format(new Date(record!.checkin_time!), 'hh:mm a')}
                  {' · '}<span style={{ textTransform: 'capitalize' }}>{record?.work_mode}</span>
                </div>
                <button className="btn-checkout" onClick={handleCheckout} disabled={actionLoading || geoLoading}>
                  {actionLoading ? 'Checking out…' : '✓ Check out'}
                </button>
              </div>
            )}
            {checkedIn && checkedOut && (
              <div>
                <div className="checkin-status">
                  Checked in at {format(new Date(record!.checkin_time!), 'hh:mm a')} &nbsp;·&nbsp;
                  Checked out at {format(new Date(record!.checkout_time!), 'hh:mm a')}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.85rem', color: '#fff', marginTop: 4 }}>
                  ✓ Done for today — see you tomorrow!
                </div>
              </div>
            )}
          </div>
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
