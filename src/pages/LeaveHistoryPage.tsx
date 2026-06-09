import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import { LeaveRequest } from '../types'
import { format } from 'date-fns'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

export default function LeaveHistoryPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const successMsg = (location.state as any)?.success

  useEffect(() => {
    api.get('/leave/history').then(r => setLeaves(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">Leave history</div>
          <div className="page-subtitle">All your leave requests</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/leave/apply')}>
          <Plus size={15} /> New request
        </button>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}

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
              <th>Admin note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading…</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={7} className="empty">No leave requests yet</td></tr>
            ) : leaves.map(l => {
              const days = Math.ceil((new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000) + 1
              return (
                <tr key={l.id}>
                  <td><span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>{l.leave_type}</span></td>
                  <td>{format(new Date(l.from_date), 'dd MMM yyyy')}</td>
                  <td>{format(new Date(l.to_date), 'dd MMM yyyy')}</td>
                  <td>{days}d</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                  <td><span className={`badge badge-${l.status}`} style={{ textTransform: 'capitalize' }}>{l.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l.admin_note || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
