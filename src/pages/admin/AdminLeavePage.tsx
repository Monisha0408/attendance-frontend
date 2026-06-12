import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { LeaveRequest } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { CheckCircle, XCircle } from 'lucide-react'

function ReviewModal({ leave, action, onClose, onDone }: {
  leave: LeaveRequest
  action: 'approve' | 'reject'
  onClose: () => void
  onDone: () => void
}) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true)
    try {
      await api.put(`/leave/${action}/${leave.id}`, { admin_note: note || null })
      onDone()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title" style={{ color: action === 'approve' ? 'var(--success)' : 'var(--danger)' }}>
          {action === 'approve' ? 'Approve' : 'Reject'} leave request
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
          <strong>{leave.user?.name}</strong> — {format(new Date(leave.from_date), 'dd MMM')} to {format(new Date(leave.to_date), 'dd MMM yyyy')}<br />
          <span style={{ color: 'var(--text-muted)' }}>{leave.reason}</span>
        </div>
        <div className="form-group">
          <label className="form-label">Note for employee <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" style={{ resize: 'vertical' }} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className={`btn ${action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLeavePage() {
  const { user: ctxUser } = useAuth()
  const stored = localStorage.getItem('user')
  const me = ctxUser || (stored ? JSON.parse(stored) : null)
  const isSuperAdmin = me?.is_superadmin === true

  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ leave: LeaveRequest; action: 'approve' | 'reject' } | null>(null)

  const load = () => {
    setLoading(true)
    const url = tab === 'pending' ? '/leave/admin/pending' : '/leave/admin/all'
    api.get(url).then(r => setLeaves(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(1) load() }, [tab])

  return (
    <>
      <div className="page-header">
        <div className="page-title">Leave requests</div>
        <div className="page-subtitle">
          {isSuperAdmin ? 'You can approve and reject leave requests' : 'View only — only super admin can approve/reject'}
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          Leave approval is restricted to super admin only. You can view requests but cannot approve or reject them.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        <button className={`btn ${tab === 'pending' ? 'btn-primary' : ''}`} onClick={() => setTab('pending')}>Pending</button>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : ''}`} onClick={() => setTab('all')}>All requests</button>
      </div>

      {/* Pagination top */}
      {Math.ceil(leaves.length / PAGE_SIZE) > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ lineHeight: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Page {page} / {Math.ceil(leaves.length / PAGE_SIZE)}
          </span>
          <button className="btn btn-sm" disabled={page >= Math.ceil(leaves.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              {isSuperAdmin && tab === 'pending' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="loading">Loading…</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={8} className="empty">
                {tab === 'pending' ? 'No pending leave requests 🎉' : 'No leave requests found'}
              </td></tr>
            ) : leaves.map(l => {
              const days = Math.ceil((new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000) + 1
              return (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{l.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.user?.employee_id}</div>
                  </td>
                  <td><span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>{l.leave_type}</span></td>
                  <td>{format(new Date(l.from_date), 'dd MMM yyyy')}</td>
                  <td>{format(new Date(l.to_date), 'dd MMM yyyy')}</td>
                  <td>{days}d</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                  <td><span className={`badge badge-${l.status}`} style={{ textTransform: 'capitalize' }}>{l.status}</span></td>
                  {isSuperAdmin && tab === 'pending' && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-success" onClick={() => setModal({ leave: l, action: 'approve' })}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setModal({ leave: l, action: 'reject' })}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ReviewModal leave={modal.leave} action={modal.action} onClose={() => setModal(null)} onDone={load} />
      )}
    </>
  )
}
