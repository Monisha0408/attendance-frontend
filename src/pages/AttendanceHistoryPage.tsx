import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import { AttendanceRecord } from '../types'
import { format, getMonth, getYear } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function AttendanceHistoryPage() {
  const now = new Date()
  const [month, setMonth] = useState(getMonth(now) + 1)
  const [year, setYear] = useState(getYear(now))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  useEffect(() => {
    setLoading(true)
    api.get('/attendance/history', { params: { month, year } })
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [month, year])

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
          <div className="page-subtitle">Check-in / check-out history with daily updates</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input form-select" style={{ width: 'auto' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
            ))}
          </select>
          <select className="form-input form-select" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
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
              <th style={{ width: 32 }}></th>
              <th>Date</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Mode</th>
              <th>Calls A/C/H/N</th>
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
              const hasUpdate = r.checkout_time && r.daily_update
              const isExpanded = expanded === r.id
              return (
                <React.Fragment key={r.id}>
                  <tr style={{ cursor: hasUpdate ? 'pointer' : 'default' }}
                    onClick={() => hasUpdate && setExpanded(isExpanded ? null : r.id)}>
                    <td>
                      {hasUpdate && (isExpanded
                        ? <ChevronDown size={14} color="var(--text-muted)" />
                        : <ChevronRight size={14} color="var(--text-muted)" />)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{format(new Date(r.date), 'dd MMM')}</td>
                    <td>{r.checkin_time ? format(new Date(r.checkin_time), 'hh:mm a') : '—'}</td>
                    <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                    <td><span className={`badge badge-${r.work_mode}`}>{r.work_mode === 'wfh' ? 'WFH' : 'Office'}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
                      {r.checkout_time
                        ? <span style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--info)' }}>{r.calls_assigned ?? 0}</span>/
                            <span style={{ color: 'var(--success)' }}>{r.calls_closed ?? 0}</span>/
                            <span style={{ color: 'var(--warning)' }}>{r.calls_hold ?? 0}</span>/
                            <span style={{ color: 'var(--danger)' }}>{r.calls_next_day ?? 0}</span>
                          </span>
                        : '—'}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{hours}</td>
                    <td><span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>{r.status}</span></td>
                  </tr>
                  {isExpanded && r.daily_update && (
                    <tr>
                      <td colSpan={8} style={{ background: 'var(--primary-light)', padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>DAILY UPDATE</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{r.daily_update}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
        A = Assigned · C = Closed · H = Hold · N = Next day · Click a row to view daily update
      </div>
    </>
  )
}
