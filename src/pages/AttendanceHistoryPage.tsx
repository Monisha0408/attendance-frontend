import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import { AttendanceRecord } from '../types'
import { format, getMonth, getYear } from 'date-fns'

export default function AttendanceHistoryPage() {
  const now = new Date()
  const [month, setMonth] = useState(getMonth(now) + 1)
  const [year, setYear] = useState(getYear(now))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/attendance/history', { params: { month, year } })
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [month, year])

  const statusBadge = (s: string) => <span className={`badge badge-${s}`} style={{ textTransform: 'capitalize' }}>{s}</span>

  const summary = {
    present: records.filter(r => r.status === 'present').length,
    halfday: records.filter(r => r.status === 'halfday').length,
    absent: records.filter(r => r.status === 'absent').length,
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">My Attendance</div>
          <div className="page-subtitle">Your check-in / check-out history</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input form-select" style={{ width: 'auto' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
            ))}
          </select>
          <select className="form-input form-select" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.25rem' }}>
        <div className="stat-card present"><div className="stat-label">Present</div><div className="stat-value">{summary.present}</div></div>
        <div className="stat-card absent"><div className="stat-label">Absent</div><div className="stat-value">{summary.absent}</div></div>
        <div className="stat-card leave"><div className="stat-label">Half day</div><div className="stat-value">{summary.halfday}</div></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Mode</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="loading">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="empty">No records for this month</td></tr>
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
                  <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                  <td><span className={`badge badge-${r.work_mode}`}>{r.work_mode === 'wfh' ? 'WFH' : 'Office'}</span></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{hours}</td>
                  <td>{statusBadge(r.status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
