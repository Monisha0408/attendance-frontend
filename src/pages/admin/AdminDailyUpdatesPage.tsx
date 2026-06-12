import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { Download } from 'lucide-react'
import { AttendanceRecord } from '../../types'
import { format } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function AdminDailyUpdatesPage() {
  const today = new Date()
  const [date, setDate] = useState(format(today, 'yyyy-MM-dd'))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const exportUpdates = async (fmt: 'pdf' | 'xlsx') => {
    setExporting(fmt)
    try {
      const res = await api.get('/reports/daily-updates/export', {
        params: { export_date: date, format: fmt },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `updates_${date}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export failed') }
    finally { setExporting(null) }
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    api.get('/attendance/admin/today', { params: { date } })
      .then(r => {
        // Only show records that have checked out with daily update
        const withUpdates = r.data.filter((rec: AttendanceRecord) => rec.checkout_time)
        setRecords(withUpdates)
      })
      .catch(() => setError('Failed to load daily updates.'))
      .finally(() => setLoading(false))
  }, [date])

  const totalCalls = records.reduce((acc, r) => ({
    assigned: acc.assigned + (r.calls_assigned ?? 0),
    closed: acc.closed + (r.calls_closed ?? 0),
    hold: acc.hold + (r.calls_hold ?? 0),
    next_day: acc.next_day + (r.calls_next_day ?? 0),
  }), { assigned: 0, closed: 0, hold: 0, next_day: 0 })

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">Daily updates</div>
          <div className="page-subtitle">Call stats and updates submitted at checkout</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={() => exportUpdates('pdf')} disabled={exporting !== null}>
            <Download size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
          <button className="btn" onClick={() => exportUpdates('xlsx')} disabled={exporting !== null}>
            <Download size={14} /> {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
          </button>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={date}
            max={format(today, 'yyyy-MM-dd')}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary stats */}
      {records.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.5rem' }}>
          <div className="stat-card wfh">
            <div className="stat-label">Total assigned</div>
            <div className="stat-value">{totalCalls.assigned}</div>
          </div>
          <div className="stat-card present">
            <div className="stat-label">Total closed</div>
            <div className="stat-value">{totalCalls.closed}</div>
          </div>
          <div className="stat-card leave">
            <div className="stat-label">Total on hold</div>
            <div className="stat-value">{totalCalls.hold}</div>
          </div>
          <div className="stat-card absent">
            <div className="stat-label">Shifted to next day</div>
            <div className="stat-value">{totalCalls.next_day}</div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Employee</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th style={{ textAlign: 'center', color: 'var(--info)' }}>Assigned</th>
              <th style={{ textAlign: 'center', color: 'var(--success)' }}>Closed</th>
              <th style={{ textAlign: 'center', color: 'var(--warning)' }}>On hold</th>
              <th style={{ textAlign: 'center', color: 'var(--danger)' }}>Next day</th>
              <th>Mode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="loading">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={10} className="empty">
                No checkout updates for {format(new Date(date + 'T00:00:00'), 'dd MMM yyyy')}
              </td></tr>
            ) : records.map(r => {
              const isExpanded = expanded === r.id
              return (
                <React.Fragment key={r.id}>
                  <tr
                    style={{ cursor: r.daily_update ? 'pointer' : 'default' }}
                    onClick={() => r.daily_update && setExpanded(isExpanded ? null : r.id)}
                  >
                    <td>
                      {r.daily_update && (
                        isExpanded
                          ? <ChevronDown size={14} color="var(--text-muted)" />
                          : <ChevronRight size={14} color="var(--text-muted)" />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user?.employee_id}</div>
                    </td>
                    <td>{r.checkin_time ? format(new Date(r.checkin_time), 'hh:mm a') : '—'}</td>
                    <td>{r.checkout_time ? format(new Date(r.checkout_time), 'hh:mm a') : '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--info)', fontSize: '1rem' }}>
                        {r.calls_assigned ?? '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
                        {r.calls_closed ?? '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '1rem' }}>
                        {r.calls_hold ?? '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1rem' }}>
                        {r.calls_next_day ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.work_mode}`}>
                        {r.work_mode === 'wfh' ? 'WFH' : 'Office'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`} style={{ textTransform: 'capitalize' }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>

                  {/* Expandable daily update row */}
                  {isExpanded && r.daily_update && (
                    <tr>
                      <td colSpan={10} style={{
                        background: 'var(--primary-light)',
                        padding: '0.85rem 1.25rem',
                        borderLeft: '3px solid var(--primary)'
                      }}>
                        <div style={{
                          fontSize: '0.72rem', fontWeight: 600,
                          color: 'var(--primary)', marginBottom: 6,
                          textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                          Major update — {r.user?.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>
                          {r.daily_update}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {records.length > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Click any row to expand the major update summary
        </div>
      )}
    </>
  )
}
