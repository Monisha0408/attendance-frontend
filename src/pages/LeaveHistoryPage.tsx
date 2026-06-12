import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import { LeaveRequest, LeaveBalance } from '../types'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B' },
  approved: { bg: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  rejected: { bg: 'rgba(185,28,28,0.15)',   color: '#EF4444' },
}

export default function LeaveHistoryPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/leave/history'),
      api.get('/leave/balance'),
    ]).then(([lr, lb]) => {
      setLeaves(lr.data)
      setBalance(lb.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div className="page-title">Leave history</div>
        <div className="page-subtitle">Your leave requests and balance</div>
      </div>

      {/* ✅ Leave balance cards */}
      {balance && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: '1.25rem' }}>
          <div className="stat-card leave">
            <div className="stat-label">Casual leave remaining</div>
            <div className="stat-value" style={{ color: balance.casual > 3 ? 'var(--success)' : 'var(--danger)' }}>
              {balance.casual} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 12</span>
            </div>
          </div>
          <div className="stat-card leave">
            <div className="stat-label">Sick leave remaining</div>
            <div className="stat-value" style={{ color: balance.sick > 2 ? 'var(--success)' : 'var(--danger)' }}>
              {balance.sick} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ 6</span>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading…</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={7} className="empty">
                No leave requests yet. <Link to="/leave/apply" style={{ color: 'var(--primary)' }}>Apply now</Link>
              </td></tr>
            ) : leaves.map(l => {
              const days = Math.ceil((new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000) + 1
              const sc = STATUS_COLORS[l.status] || STATUS_COLORS.pending
              return (
                <tr key={l.id}>
                  <td style={{ textTransform: 'capitalize' }}>{l.leave_type}</td>
                  <td>{format(new Date(l.from_date), 'dd MMM yyyy')}</td>
                  <td>{format(new Date(l.to_date), 'dd MMM yyyy')}</td>
                  <td>{days}d</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                  <td>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {l.status}
                    </span>
                    {l.reason?.startsWith('Public Holiday') && (
                      <span style={{ marginLeft: 4, fontSize: '0.68rem', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '1px 6px', borderRadius: 4 }}>
                        Holiday
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {l.status === 'rejected' && l.admin_note
                      ? <span style={{ color: 'var(--danger)', background: 'var(--danger-bg)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                          ✗ {l.admin_note}
                        </span>
                      : l.status === 'approved' && l.admin_note
                        ? <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>{l.admin_note}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>{l.admin_note || '—'}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
