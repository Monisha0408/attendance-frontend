import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import { MonthlyReportRow } from '../../types'
import { format } from 'date-fns'
import { Download } from 'lucide-react'

const PAGE_SIZE = 15

export default function AdminReportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState<MonthlyReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<string | null>(null)

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    api.get('/reports/monthly', { params: { year, month } })
      .then(r => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [year, month])

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const workingDays = rows[0]?.working_days ?? 0

  const doExport = async (fmt: string) => {
    setExporting(fmt)
    try {
      const res = await api.get('/reports/export', {
        params: { year, month, format: fmt },
        responseType: 'blob',
      })
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'pdf' ? 'pdf' : 'docx'
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${year}_${String(month).padStart(2,'0')}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export failed') }
    finally { setExporting(null) }
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">Attendance Reports</div>
          <div className="page-subtitle">
            Monthly summary — Working days: <strong>{workingDays}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-input form-select" style={{ width: 'auto' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={i+1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
            ))}
          </select>
          <select className="form-input form-select" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn" disabled={!!exporting} onClick={() => doExport('xlsx')}>
            <Download size={14} /> {exporting === 'xlsx' ? 'Exporting…' : 'Excel'}
          </button>
          <button className="btn" disabled={!!exporting} onClick={() => doExport('pdf')}>
            <Download size={14} /> {exporting === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
          <button className="btn" disabled={!!exporting} onClick={() => doExport('docx')}>
            <Download size={14} /> {exporting === 'docx' ? 'Exporting…' : 'Word'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.25rem' }}>
          <div className="stat-card wfh">
            <div className="stat-label">Working days</div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>{workingDays}</div>
          </div>
          <div className="stat-card present">
            <div className="stat-label">Total present</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {rows.reduce((a, r) => a + r.total_present, 0)}
            </div>
          </div>
          <div className="stat-card absent">
            <div className="stat-label">Total absent</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {rows.reduce((a, r) => a + r.total_absent, 0)}
            </div>
          </div>
          <div className="stat-card leave">
            <div className="stat-label">Total on leave</div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {rows.reduce((a, r) => a + r.total_leave, 0)}
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Name</th>
              <th>Department</th>
              <th style={{ textAlign: 'center' }}>Working Days</th>
              <th style={{ textAlign: 'center', color: 'var(--success)' }}>Present</th>
              <th style={{ textAlign: 'center', color: 'var(--danger)' }}>Absent</th>
              <th style={{ textAlign: 'center', color: 'var(--warning)' }}>Half day</th>
              <th style={{ textAlign: 'center' }}>Leave</th>
              <th style={{ textAlign: 'center' }}>Office visits</th>
              <th style={{ textAlign: 'center' }}>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="loading">Loading…</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={10} className="empty">No data for this month</td></tr>
            ) : paged.map(r => {
              const pct = r.working_days > 0 ? ((r.total_present + r.total_halfday * 0.5) / r.working_days * 100).toFixed(1) : '—'
              const pctNum = parseFloat(pct)
              return (
                <tr key={r.employee_id}>
                  <td className="font-mono" style={{ fontSize: '0.85rem' }}>{r.employee_id}</td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.department || '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.working_days}</td>
                  <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{r.total_present}</td>
                  <td style={{ textAlign: 'center', color: r.total_absent > 0 ? 'var(--danger)' : undefined, fontWeight: 600 }}>{r.total_absent}</td>
                  <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 600 }}>{r.total_halfday}</td>
                  <td style={{ textAlign: 'center' }}>{r.total_leave}</td>
                  <td style={{ textAlign: 'center' }}>{r.total_office_visits}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 700,
                      color: !isNaN(pctNum) ? (pctNum >= 80 ? 'var(--success)' : pctNum >= 60 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)'
                    }}>{isNaN(pctNum) ? '—' : `${pct}%`}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1rem' }}>
          <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i+1} className={`btn btn-sm ${page === i+1 ? 'btn-primary' : ''}`} onClick={() => setPage(i+1)}>
              {i+1}
            </button>
          ))}
          <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        Exported files include a Summary sheet/page with charts for attendance and call statistics.
      </div>
    </>
  )
}
