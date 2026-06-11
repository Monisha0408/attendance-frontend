import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { AttendanceRecord, User } from '../../types'
import { format, getMonth, getYear } from 'date-fns'
import { MapPin } from 'lucide-react'

function LocationCell({ name, lat, lng }: { name?: string | null; lat?: number | null; lng?: number | null }) {
  if (name) return <span className="location-pill"><MapPin size={11} />{name}</span>
  if (lat) return <span className="location-pill"><MapPin size={11} />{lat.toFixed(4)}, {lng?.toFixed(4)}</span>
  return <span style={{ color: 'var(--text-muted)' }}>—</span>
}

export default function AdminAttendancePage() {
  const now = new Date()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [month, setMonth] = useState(getMonth(now) + 1)
  const [year, setYear] = useState(getYear(now))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data))
  }, [])

  useEffect(() => {
    if (!selectedUser) return
    setLoading(true)
    api.get(`/attendance/admin/user/${selectedUser}`, { params: { month, year } })
      .then(r => setRecords(r.data))
      .finally(() => setLoading(false))
  }, [selectedUser, month, year])

  return (
    <>
      <div className="page-header">
        <div className="page-title">Attendance records</div>
        <div className="page-subtitle">Full records with check-in/out locations</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select className="form-input form-select" style={{ width: 200 }} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
          <option value="">Select employee</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id})</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 140 }} value={month} onChange={e => setMonth(+e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
          ))}
        </select>
        <select className="form-input form-select" style={{ width: 100 }} value={year} onChange={e => setYear(+e.target.value)}>
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {!selectedUser ? (
        <div className="empty">Select an employee to view their attendance</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check-in</th>
                <th>Check-in location</th>
                <th>Check-out</th>
                <th>Check-out location</th>
                <th>Mode</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="loading">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="empty">No records for this month</td></tr>
              ) : records.map(r => {
                let hours = '—'
                if (r.checkin_time && r.checkout_time) {
                  const h = (new Date(r.checkout_time).getTime() - new Date(r.checkin_time).getTime()) / 3600000
                  hours = `${h.toFixed(1)}h`
                }
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{format(new Date(r.date), 'dd MMM')}</td>
                    <td>{r.checkin_time ? format(new Date(r.checkin_time), 'hh:mm a') : '—'}</td>
                    <td><LocationCell name={r.checkin_location_name} lat={r.checkin_latitude} lng={r.checkin_longitude} /></td>
                    <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                    <td><LocationCell name={r.checkout_location_name} lat={r.checkout_latitude} lng={r.checkout_longitude} /></td>
                    <td><span className={`badge badge-${r.work_mode}`}>{r.work_mode === 'wfh' ? 'WFH' : 'Office'}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{hours}</td>
                    <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
