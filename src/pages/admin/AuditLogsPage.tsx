import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { AuditLog } from '../../types'
import { format } from 'date-fns'
import { ShieldCheck } from 'lucide-react'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_user: { label: 'Created user', color: 'var(--info)' },
  update_user: { label: 'Updated user', color: 'var(--text-muted)' },
  reset_password: { label: 'Reset password', color: 'var(--warning)' },
  deactivate_user: { label: 'Deactivated user', color: 'var(--danger)' },
  promote_admin: { label: 'Promoted to admin', color: 'var(--success)' },
  demote_employee: { label: 'Demoted to employee', color: 'var(--warning)' },
}

export default function AuditLogsPage() {
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/superadmin/audit-logs')
      .then(r => setLogs(r.data))
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} /> Audit logs
        </div>
        <div className="page-subtitle">All admin actions — visible only to super admin</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Performed by</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="loading">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="empty">No audit logs yet</td></tr>
            ) : logs.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(log => {
              const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)' }
              return (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.performed_by_name || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: meta.color }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.detail || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {Math.ceil(logs.length / PAGE_SIZE) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
          <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ lineHeight: '32px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page {page} / {Math.ceil(logs.length / PAGE_SIZE)}
          </span>
          <button className="btn btn-sm" disabled={page >= Math.ceil(logs.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </>
  )
}
