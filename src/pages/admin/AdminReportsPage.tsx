import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { MonthlyReportRow } from '../../types'
import { format, getMonth, getYear } from 'date-fns'
import { Download } from 'lucide-react'

export default function AdminReportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(getMonth(now) + 1)
  const [year, setYear] = useState(getYear(now))
  const [rows, setRows] = useState<MonthlyReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const load = () => {
    setLoading(true)
    setError('')
    api.get('/reports/monthly', { params: { month, year } })
      .then(r => setRows(r.data))
      .catch(() => setError('Failed to load report. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month, year])

  const exportFile = async (fmt: 'xlsx' | 'csv') => {
    setExportLoading(true)
    setExportError('')
    try {
      const res = await api.get('/reports/export', {
        params: { month, year, format: fmt },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${year}_${String(month).padStart(2, '0')}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const totals = rows.reduce((acc, r) => ({
    present: acc.present + r.total_present,
    absent: acc.absent + r.total_absent,
    halfday: acc.halfday + r.total_halfday,
    leave: acc.leave + r.total_leave,
    wfh: acc.wfh + r.total_wfh,
  }), { present: 0, absent: 0, halfday: 0, leave: 0, wfh: 0 })

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">Monthly attendance summary — export to Excel or CSV</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => exportFile('xlsx')} disabled={exportLoading}>
            <Download size={14} /> Excel
          </button>
          <button className="btn" onClick={() => exportFile('csv')} disabled={exportLoading}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {exportError && <div className="alert alert-error">{exportError}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        <select className="form-input form-select" style={{ width: 140 }} value={month} onChange={e => setMonth(+e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
          ))}
        </select>
        <select className="form-input form-select" style={{ width: 100 }} value={year} onChange={e => setYear(+e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th style={{ textAlign: 'center' }}>Present</th>
              <th style={{ textAlign: 'center' }}>Absent</th>
              <th style={{ textAlign: 'center' }}>Half day</th>
              <th style={{ textAlign: 'center' }}>Leave</th>
              <th style={{ textAlign: 'center' }}>WFH days</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="empty">No data for this month</td></tr>
            ) : (
              <>
                {rows.map(r => (
                  <tr key={r.employee_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.employee_id}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.department || '—'}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ color: 'var(--success)', fontWeight: 600 }}>{r.total_present}</span></td>
                    <td style={{ textAlign: 'center' }}><span style={{ color: 'var(--danger)', fontWeight: 600 }}>{r.total_absent}</span></td>
                    <td style={{ textAlign: 'center' }}><span style={{ color: 'var(--warning)', fontWeight: 600 }}>{r.total_halfday}</span></td>
                    <td style={{ textAlign: 'center' }}>{r.total_leave}</td>
                    <td style={{ textAlign: 'center' }}>{r.total_wfh}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border-strong)', fontWeight: 600, background: 'var(--bg)' }}>
                  <td>Total</td>
                  <td></td>
                  <td style={{ textAlign: 'center', color: 'var(--success)' }}>{totals.present}</td>
                  <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{totals.absent}</td>
                  <td style={{ textAlign: 'center', color: 'var(--warning)' }}>{totals.halfday}</td>
                  <td style={{ textAlign: 'center' }}>{totals.leave}</td>
                  <td style={{ textAlign: 'center' }}>{totals.wfh}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
