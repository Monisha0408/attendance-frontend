import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { DashboardStats, AttendanceRecord } from '../../types'
import { format } from 'date-fns'
import { MapPin } from 'lucide-react'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [today, setToday] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/attendance/admin/today'),
    ]).then(([s, t]) => {
      setStats(s.data)
      setToday(t.data)
    }).catch(() => {
      setError('Failed to load dashboard data. Please refresh.')
    }).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div className="page-title">Admin dashboard</div>
        <div className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total employees</div><div className="stat-value">{stats.total_employees}</div></div>
          <div className="stat-card present"><div className="stat-label">Present today</div><div className="stat-value">{stats.present_today}</div></div>
          <div className="stat-card absent"><div className="stat-label">Absent</div><div className="stat-value">{stats.absent_today}</div></div>
          <div className="stat-card leave"><div className="stat-label">On leave</div><div className="stat-value">{stats.on_leave_today}</div></div>
          <div className="stat-card wfh"><div className="stat-label">Working from home</div><div className="stat-value">{stats.wfh_today}</div></div>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Today's check-ins</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Check-in</th>
              <th>Check-in location</th>
              <th>Check-out</th>
              <th>Check-out location</th>
              <th>Mode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading…</td></tr>
            ) : today.length === 0 ? (
              <tr><td colSpan={7} className="empty">No check-ins yet today</td></tr>
            ) : today.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.user?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user?.employee_id}</div>
                </td>
                <td>{r.checkin_time ? format(new Date(r.checkin_time), 'hh:mm a') : '—'}</td>
                <td>
                  {r.checkin_location_name
                    ? <span className="location-pill"><MapPin size={11} />{r.checkin_location_name}</span>
                    : r.checkin_latitude
                      ? <span className="location-pill"><MapPin size={11} />{r.checkin_latitude?.toFixed(4)}, {r.checkin_longitude?.toFixed(4)}</span>
                      : <span className="text-muted">—</span>}
                </td>
                <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                <td>
                  {r.checkout_location_name
                    ? <span className="location-pill"><MapPin size={11} />{r.checkout_location_name}</span>
                    : r.checkout_latitude
                      ? <span className="location-pill"><MapPin size={11} />{r.checkout_latitude?.toFixed(4)}, {r.checkout_longitude?.toFixed(4)}</span>
                      : <span className="text-muted">—</span>}
                </td>
                <td><span className={`badge badge-${r.work_mode}`}>{r.work_mode === 'wfh' ? 'WFH' : 'Office'}</span></td>
                <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
