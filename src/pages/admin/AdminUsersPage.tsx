import React, { useEffect, useState } from 'react'
import api from '../../utils/api'
import { User } from '../../types'
import { format } from 'date-fns'
import { Plus, RefreshCw, UserX, Copy, Check } from 'lucide-react'

interface NewUserForm {
  employee_id: string
  name: string
  email: string
  role: 'admin' | 'employee'
  department: string
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<NewUserForm>({ employee_id: '', name: '', email: '', role: 'employee', department: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ user: User; generated_password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/users', form)
      setCreated(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(created!.generated_password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-title">Employee created</div>
          <div className="alert alert-success">
            <strong>{created.user.name}</strong> has been added as {created.user.employee_id}.
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Share this temporary password with the employee. It will not be shown again.
          </p>
          <div className="password-reveal">{created.generated_password}</div>
          <p className="password-warn">⚠ Copy this now — it won't be shown again.</p>
          <div className="modal-actions">
            <button className="btn" onClick={copy}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy password</>}
            </button>
            <button className="btn btn-primary" onClick={() => { onCreated(); onClose() }}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">Add new employee</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-input" value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="EMP001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Department <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Engineering" />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            A secure password will be generated automatically.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [newPass, setNewPass] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = async () => {
    setLoading(true)
    try {
      const { data } = await api.post(`/users/${user.id}/reset-password`)
      setNewPass(data.generated_password)
    } catch {}
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(newPass!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">Reset password for {user.name}</div>
        {!newPass ? (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              This will immediately invalidate their current password and generate a new one. They will need to use the new password to log in.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-danger" onClick={reset} disabled={loading}>
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="password-reveal">{newPass}</div>
            <p className="password-warn">⚠ Copy and share this now — it won't be shown again.</p>
            <div className="modal-actions">
              <button className="btn" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [resetUser, setResetUser] = useState<User | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deactivate = async (u: User) => {
    if (!confirm(`Deactivate ${u.name}? They won't be able to log in.`)) return
    await api.delete(`/users/${u.id}`)
    load()
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="page-title">Employees</div>
          <div className="page-subtitle">{users.length} active · Add, manage, or reset passwords</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> Add employee
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading…</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td className="font-mono" style={{ fontSize: '0.85rem' }}>{u.employee_id}</td>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                <td style={{ color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                <td><span className={`badge badge-${u.role}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{format(new Date(u.created_at), 'dd MMM yyyy')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => setResetUser(u)} title="Reset password">
                      <RefreshCw size={13} />
                    </button>
                    <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }} onClick={() => deactivate(u)} title="Deactivate">
                      <UserX size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => { setResetUser(null) }} />}
    </>
  )
}
