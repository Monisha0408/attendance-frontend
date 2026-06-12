import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import { AttendanceRecord } from '../types'
import { format, getMonth, getYear } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function MyUpdatesPage() {
  const now = new Date()
  const [month, setMonth] = useState(getMonth(now) + 1)
  const [year, setYear] = useState(getYear(now))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i)

  useEffect(() => {
    setLoading(true)
    api.get('/attendance/history', { params: { month, year } })
      .then(r => setRecords(r.data.filter((rec: AttendanceRecord) => rec.checkout_time)))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [month, year])

  const totals = records.reduce((acc, r) => ({
    assigned: acc.assigned + (r.calls_assigned ?? 0),
    closed: acc.closed + (r.calls_closed ?? 0),
    hold: acc.hold + (r.calls_hold ?? 0),
    next_day: acc.next_day + (r.calls_next_day ?? 0),
  }), { assigned: 0, closed: 0, hold: 0, next_day: 0 })

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">My daily updates</div>
          <div className="page-subtitle">Your call stats and summaries by day</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input form-select" style={{ width: 'auto' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
            ))}
          </select>
          <select className="form-input form-select" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Month totals */}
      {records.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.25rem' }}>
          {[
            { label: 'Total assigned', value: totals.assigned, color: 'var(--info)' },
            { label: 'Total closed', value: totals.closed, color: 'var(--success)' },
            { label: 'Total hold', value: totals.hold, color: 'var(--warning)' },
            { label: 'Total next day', value: totals.next_day, color: 'var(--danger)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Date</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th style={{ textAlign: 'center', color: 'var(--info)' }}>Assigned</th>
              <th style={{ textAlign: 'center', color: 'var(--success)' }}>Closed</th>
              <th style={{ textAlign: 'center', color: 'var(--warning)' }}>Hold</th>
              <th style={{ textAlign: 'center', color: 'var(--danger)' }}>Next day</th>
              <th>Office</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="loading">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={9} className="empty">No checkout records for this month</td></tr>
            ) : records.map(r => {
              const isExp = expanded === r.id
              return (
                <React.Fragment key={r.id}>
                  <tr
                    style={{ cursor: r.daily_update ? 'pointer' : 'default' }}
                    onClick={() => r.daily_update && setExpanded(isExp ? null : r.id)}
                  >
                    <td>{r.daily_update && (isExp ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />)}</td>
                    <td style={{ fontWeight: 500 }}>{format(new Date(r.date), 'dd MMM')}</td>
                    <td>{r.checkin_time ? format(new Date(r.checkin_time), 'hh:mm a') : '—'}</td>
                    <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--info)' }}>{r.calls_assigned ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{r.calls_closed ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--warning)' }}>{r.calls_hold ?? '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--danger)' }}>{r.calls_next_day ?? '—'}</td>
                    <td>
                      {r.visited_office === true
                        ? <span className="badge badge-present">Office</span>
                        : r.visited_office === false
                          ? <span className="badge badge-wfh">Remote</span>
                          : '—'}
                    </td>
                  </tr>
                  {isExp && r.daily_update && (
                    <tr>
                      <td colSpan={9} style={{ background: 'var(--primary-light)', padding: '0.75rem 1rem', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Major update</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{r.daily_update}</div>
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
        Click any row to expand the daily update summary
      </div>
    </>
  )
}
