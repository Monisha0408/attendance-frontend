import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import { AttendanceRecord } from '../types'
import { useHolidays } from '../hooks/useHolidays'
import { format, getMonth, getYear, getDaysInMonth, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function AttendanceHistoryPage() {
  const now = new Date()
  const [month, setMonth] = useState(getMonth(now) + 1)
  const [year, setYear] = useState(getYear(now))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const { isHoliday, isSunday } = useHolidays()
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  useEffect(() => {
    setLoading(true)
    api.get('/attendance/history', { params: { month, year } })
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [month, year])

  // Build full calendar with holidays/sundays marked
  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const recordMap = new Map(records.map(r => [r.date, r]))

  const summary = {
    present: records.filter(r => r.status === 'present').length,
    halfday: records.filter(r => r.status === 'halfday').length,
    absent: records.filter(r => r.status === 'absent').length,
    holidays: allDays.filter(d => {
      const ds = format(d, 'yyyy-MM-dd')
      return isSunday(ds) || !!isHoliday(ds)
    }).length,
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">My Attendance</div>
          <div className="page-subtitle">Full month view with holidays</div>
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

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.25rem' }}>
        <div className="stat-card present"><div className="stat-label">Present</div><div className="stat-value">{summary.present}</div></div>
        <div className="stat-card absent"><div className="stat-label">Absent</div><div className="stat-value">{summary.absent}</div></div>
        <div className="stat-card leave"><div className="stat-label">Half day</div><div className="stat-value">{summary.halfday}</div></div>
        <div className="stat-card wfh"><div className="stat-label">Holidays</div><div className="stat-value">{summary.holidays}</div></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Date</th>
              <th>Day</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Calls A/C/H/N</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="loading">Loading…</td></tr>
            ) : allDays.map(day => {
              const ds = format(day, 'yyyy-MM-dd')
              const dayName = format(day, 'EEE')
              const isSun = isSunday(ds)
              const holidayName = isHoliday(ds)
              const isNonWorking = isSun || !!holidayName
              const r = recordMap.get(ds)
              const isFuture = day > now

              if (isNonWorking) {
                return (
                  <tr key={ds} style={{ background: 'rgba(99,102,241,0.05)' }}>
                    <td></td>
                    <td style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{format(day, 'dd MMM')}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{dayName}</td>
                    <td colSpan={5}>
                      <span style={{ fontSize: '0.78rem', color: '#7C3AED', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                        {isSun ? '🗓 Sunday' : `🎉 ${holidayName}`}
                      </span>
                    </td>
                  </tr>
                )
              }

              if (isFuture || !r) {
                return (
                  <tr key={ds} style={{ opacity: isFuture ? 0.4 : 1 }}>
                    <td></td>
                    <td style={{ fontWeight: 500 }}>{format(day, 'dd MMM')}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{dayName}</td>
                    <td colSpan={5} style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {isFuture ? '—' : <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>No record</span>}
                    </td>
                  </tr>
                )
              }

              let hours = '—'
              if (r.checkin_time && r.checkout_time) {
                const h = (new Date(r.checkout_time).getTime() - new Date(r.checkin_time).getTime()) / 3600000
                hours = `${h.toFixed(1)}h`
              }
              const hasUpdate = r.checkout_time && r.daily_update
              const isExp = expanded === r.id

              return (
                <React.Fragment key={ds}>
                  <tr style={{ cursor: hasUpdate ? 'pointer' : 'default' }}
                    onClick={() => hasUpdate && setExpanded(isExp ? null : r.id)}>
                    <td>{hasUpdate && (isExp ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />)}</td>
                    <td style={{ fontWeight: 500 }}>{format(day, 'dd MMM')}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{dayName}</td>
                    <td>{r.checkin_time ? format(new Date(r.checkin_time), 'hh:mm a') : '—'}</td>
                    <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
                      {r.checkout_time
                        ? <span>
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
                  {isExp && r.daily_update && (
                    <tr>
                      <td colSpan={8} style={{ background: 'var(--primary-light)', padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>DAILY UPDATE</div>
                        <div style={{ fontSize: '0.875rem' }}>{r.daily_update}</div>
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
        A = Assigned · C = Closed · H = Hold · N = Next day · Click row to expand daily update
      </div>
    </>
  )
}
