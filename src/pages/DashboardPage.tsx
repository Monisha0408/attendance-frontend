import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import api from '../utils/api'
import { AttendanceRecord, SpareFromOffice, SpareFromOutside, SpareRequired } from '../types'
import { format } from 'date-fns'
import { Plus, Trash2, Upload, X, FileText, Image } from 'lucide-react'
import { getMonth, getYear } from 'date-fns'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const EMPTY_FORM = {
  visited_office: null as boolean | null,
  calls_assigned: '',
  calls_closed: '',
  calls_hold: '0',      // ✅ default 0
  calls_next_day: '0',  // ✅ default 0
  daily_update: '',
}

interface BillFile { name: string; url: string; type: string }

export default function DashboardPage() {
  const { user } = useAuth()
  const { getPosition, requestPermission, loading: geoLoading, error: geoError } = useGeolocation()
  const stored = localStorage.getItem('user')
  const resolvedUser = user || (stored ? JSON.parse(stored) : null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())
  const [showCheckout, setShowCheckout] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [uploadingBill, setUploadingBill] = useState(false)

  // Spares state
  const [sparesOffice, setSparesOffice] = useState<SpareFromOffice[]>([])
  const [sparesOutside, setSparesOutside] = useState<SpareFromOutside[]>([])
  const [sparesRequired, setSparesRequired] = useState<SpareRequired[]>([])
  const [bills, setBills] = useState<BillFile[]>([])
  const [monthStats, setMonthStats] = useState<{present:number,absent:number,halfday:number,leave:number} | null>(null)
  const [streak, setStreak] = useState<{streak:number,best:number} | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchToday()
    // ✅ Request location permission early so browser prompts before check-in
    requestPermission()
  }, [])

  const fetchToday = async () => {
    try {
      const { data } = await api.get('/attendance/today')
      setRecord(data)
    } catch (e: any) {
      if (e.response?.status !== 404) setError('Failed to load today\'s record')
    } finally {
      setPageLoading(false)
    }
  }

  const handleCheckin = async () => {
    setActionLoading(true); setError(''); setMessage('')
    const geo = await getPosition()
    try {
      const { data } = await api.post('/attendance/checkin', {
        latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null,
        location_name: geo ? `${geo.location_name} [${geo.source === 'ip' ? 'IP' : 'GPS'}]` : null,
      })
      setRecord(data); setMessage('Checked in successfully!')
    } catch (e: any) { setError(e.response?.data?.detail || 'Check-in failed') }
    finally { setActionLoading(false) }
  }

  const validate = () => {
    const errs: Record<string, string> = {}

    if (form.visited_office === null) errs.visited_office = 'Required'
    if (form.calls_assigned === '') errs.calls_assigned = 'Required'
    if (form.calls_closed === '') errs.calls_closed = 'Required'
    if (form.calls_hold === '') errs.calls_hold = 'Required'
    if (form.calls_next_day === '') errs.calls_next_day = 'Required'
    if (!form.daily_update.trim()) errs.daily_update = 'Required'

    // ✅ Rule: closed + hold + next_day must equal assigned
    const assigned = Number(form.calls_assigned) || 0
    const closed = Number(form.calls_closed) || 0
    const hold = Number(form.calls_hold) || 0
    const nextDay = Number(form.calls_next_day) || 0
    const distributed = closed + hold + nextDay

    if (form.calls_assigned !== '' && form.calls_closed !== '') {
      if (distributed !== assigned) {
        const diff = assigned - distributed
        const msg = diff > 0
          ? `Calls don't add up. You have ${diff} unaccounted call(s). Closed + Hold + Next day must equal Assigned (${assigned}).`
          : `Calls exceed assigned. Closed + Hold + Next day (${distributed}) is ${Math.abs(diff)} more than Assigned (${assigned}).`
        errs.calls_split = msg
      }
    }

    // ✅ Rule: if outside spares added, bill upload is mandatory
    if (sparesOutside.length > 0 && bills.length === 0) {
      errs.bills = 'Bill upload is required when spares are purchased outside.'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setActionLoading(true); setError(''); setMessage('')
    const geo = await getPosition()
    try {
      const { data } = await api.post('/attendance/checkout', {
        latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null,
        location_name: geo ? `${geo.location_name} [${geo.source === 'ip' ? 'IP' : 'GPS'}]` : null,
        visited_office: form.visited_office,
        calls_assigned: Number(form.calls_assigned),
        calls_closed: Number(form.calls_closed),
        calls_hold: Number(form.calls_hold),
        calls_next_day: Number(form.calls_next_day),
        daily_update: form.daily_update.trim(),
        spares_from_office: sparesOffice,
        spares_from_outside: sparesOutside,
        spares_required: sparesRequired,
        bill_urls: bills.map(b => b.url),
      })
      setRecord(data)
      setShowCheckout(false)
      setForm(EMPTY_FORM)
      setSparesOffice([]); setSparesOutside([]); setSparesRequired([]); setBills([])
      setFormErrors({})
      setMessage('Checked out successfully!')
    } catch (e: any) { setError(e.response?.data?.detail || 'Check-out failed') }
    finally { setActionLoading(false) }
  }

  const setField = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }))
    setFormErrors(f => { const n = { ...f }; delete n[k]; return n })
  }

  // Bill upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBill(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/attendance/upload-bill', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setBills(b => [...b, { name: file.name, url: data.url, type: file.type }])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally {
      setUploadingBill(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Spare helpers
  const addSpareOffice = () => setSparesOffice(s => [...s, { name: '', qty: '' }])
  const updateSpareOffice = (i: number, k: keyof SpareFromOffice, v: string) =>
    setSparesOffice(s => s.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const removeSpareOffice = (i: number) => setSparesOffice(s => s.filter((_, j) => j !== i))

  const addSpareOutside = () => setSparesOutside(s => [...s, { name: '', qty: '', cost: 0 }])
  const updateSpareOutside = (i: number, k: keyof SpareFromOutside, v: string) =>
    setSparesOutside(s => s.map((x, j) => j === i ? { ...x, [k]: k === 'cost' ? Number(v) : v } : x))
  const removeSpareOutside = (i: number) => setSparesOutside(s => s.filter((_, j) => j !== i))

  const addSpareRequired = () => setSparesRequired(s => [...s, { name: '', reason: '' }])
  const updateSpareRequired = (i: number, k: keyof SpareRequired, v: string) =>
    setSparesRequired(s => s.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const removeSpareRequired = (i: number) => setSparesRequired(s => s.filter((_, j) => j !== i))

  const checkedIn = !!record?.checkin_time
  const checkedOut = !!record?.checkout_time

  const getPlaceholder = () => {
    const hold = Number(form.calls_hold) || 0
    const next = Number(form.calls_next_day) || 0
    const extras = []
    if (hold > 0) extras.push(`reason for ${hold} call${hold > 1 ? 's' : ''} on hold`)
    if (next > 0) extras.push(`reason for ${next} call${next > 1 ? 's' : ''} shifted to next day`)
    if (extras.length > 0) return `Describe today's activities. Include ${extras.join(' and ')}.`
    return 'Describe the key activities and updates for today…'
  }

  const sectionStyle = { borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }
  const sectionTitle = { fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }

  return (
    <>
      <div className="page-header">
        <div className="page-title">{getGreeting()}, {resolvedUser?.name?.split(' ')[0]}</div>
        <div className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {geoError && <div className="alert alert-info">{geoError}</div>}

      {/* Clock card */}
      <div style={{ background: '#16213E', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{format(time, 'HH:mm:ss')}</div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: '1.25rem' }}>{format(time, 'EEEE, MMM d')}</div>

        {!pageLoading && !checkedIn && (
          <button onClick={handleCheckin} disabled={actionLoading || geoLoading}
            style={{ background: '#fff', color: '#B91C1C', border: 'none', borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            {actionLoading ? 'Checking in…' : '✓ Check in'}
          </button>
        )}

        {!pageLoading && checkedIn && !checkedOut && !showCheckout && (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.75rem' }}>
              Checked in at {format(new Date(record!.checkin_time!), 'hh:mm a')}
            </div>
            <button onClick={() => setShowCheckout(true)}
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
              ✓ Check out
            </button>
          </div>
        )}

        {!pageLoading && checkedIn && checkedOut && (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.5rem' }}>
              In: {format(new Date(record!.checkin_time!), 'hh:mm a')} · Out: {format(new Date(record!.checkout_time!), 'hh:mm a')}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', padding: '0.4rem 0.9rem', borderRadius: 6, fontSize: '0.85rem' }}>
              ✓ Done for today
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ CHECKOUT FORM ═══════════ */}
      {showCheckout && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.3)' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>End of day — checkout form</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            All starred fields are required.
          </div>

          <form onSubmit={handleCheckout}>

            {/* ── 1. Office visit ── */}
            <div className="form-group">
              <label className="form-label">Did you visit the office today? <span style={{ color: 'var(--danger)' }}>*</span></label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[{ label: 'Yes, visited office', value: true }, { label: 'No, worked remotely', value: false }].map(opt => (
                  <button key={String(opt.value)} type="button"
                    onClick={() => setField('visited_office', opt.value)}
                    style={{
                      padding: '0.5rem 1.25rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${form.visited_office === opt.value ? 'var(--primary)' : 'var(--border-strong)'}`,
                      background: form.visited_office === opt.value ? 'var(--primary-light)' : 'var(--surface)',
                      color: form.visited_office === opt.value ? 'var(--primary)' : 'var(--text)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {formErrors.visited_office && <div className="form-error">{formErrors.visited_office}</div>}
            </div>

            {/* ── 2. Call stats ── */}
            <div style={sectionStyle}>
              <div style={sectionTitle}>Call statistics <span style={{ color: 'var(--danger)' }}>*</span></div>

              {/* ✅ Live split indicator */}
              {form.calls_assigned !== '' && (
                (() => {
                  const assigned = Number(form.calls_assigned) || 0
                  const closed = Number(form.calls_closed) || 0
                  const hold = Number(form.calls_hold) || 0
                  const nextDay = Number(form.calls_next_day) || 0
                  const distributed = closed + hold + nextDay
                  const diff = assigned - distributed
                  const isOk = diff === 0
                  const color = isOk ? 'var(--success)' : 'var(--danger)'
                  const bg = isOk ? 'var(--success-bg)' : 'var(--danger-bg)'
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', background: bg, borderRadius: 7, marginBottom: '0.75rem', fontSize: '0.82rem', color }}>
                      <span>{isOk ? '✓' : '✗'}</span>
                      <span>
                        Closed ({closed}) + Hold ({hold}) + Next day ({nextDay}) = <strong>{distributed}</strong>
                        {!isOk && <> — {diff > 0 ? `${diff} unaccounted` : `${Math.abs(diff)} over assigned`} out of <strong>{assigned}</strong> assigned</>}
                        {isOk && <> — matches {assigned} assigned ✓</>}
                      </span>
                    </div>
                  )
                })()
              )}

              {formErrors.calls_split && (
                <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{formErrors.calls_split}</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  { key: 'calls_assigned', label: 'Calls assigned' },
                  { key: 'calls_closed', label: 'Calls closed' },
                  { key: 'calls_hold', label: 'Calls on hold' },
                  { key: 'calls_next_day', label: 'Shifted to next day' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="form-label">
                      {label} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input className="form-input" type="number" min="0"
                      value={form[key as keyof typeof form] as string}
                      onChange={e => setField(key, e.target.value)}
                      placeholder="0"
                      style={formErrors[key] ? { borderColor: 'var(--danger)' } : {}} />
                    {formErrors[key] && <div className="form-error">{formErrors[key]}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. Daily update ── */}
            <div style={sectionStyle}>
              <div style={sectionTitle}>Major update / summary <span style={{ color: 'var(--danger)' }}>*</span></div>
              {(Number(form.calls_hold) > 0 || Number(form.calls_next_day) > 0) && (
                <div style={{ fontSize: '0.78rem', color: 'var(--warning)', background: 'var(--warning-bg)', padding: '0.4rem 0.75rem', borderRadius: 6, marginBottom: 8 }}>
                  ⚠ Include reason for {Number(form.calls_hold) > 0 ? `${form.calls_hold} call(s) on hold` : ''}{Number(form.calls_hold) > 0 && Number(form.calls_next_day) > 0 ? ' and ' : ''}{Number(form.calls_next_day) > 0 ? `${form.calls_next_day} call(s) shifted to next day` : ''}.
                </div>
              )}
              <textarea className="form-input" rows={4}
                value={form.daily_update}
                onChange={e => setField('daily_update', e.target.value)}
                placeholder={getPlaceholder()}
                style={{ resize: 'vertical', ...(formErrors.daily_update ? { borderColor: 'var(--danger)' } : {}) }} />
              {formErrors.daily_update && <div className="form-error">{formErrors.daily_update}</div>}
            </div>

            {/* ── 4. Spares from office ── */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={sectionTitle}>Spares taken from office</div>
                <button type="button" className="btn btn-sm" onClick={addSpareOffice}><Plus size={13} /> Add</button>
              </div>
              {sparesOffice.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No spares taken from office today.</div>}
              {sparesOffice.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                  <input className="form-input" placeholder="Spare name / part" value={s.name} onChange={e => updateSpareOffice(i, 'name', e.target.value)} />
                  <input className="form-input" placeholder="Qty (e.g. 2 pcs)" value={s.qty} onChange={e => updateSpareOffice(i, 'qty', e.target.value)} />
                  <button type="button" className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeSpareOffice(i)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            {/* ── 5. Spares from outside ── */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={sectionTitle}>Spares purchased outside <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(with cost)</span></div>
                <button type="button" className="btn btn-sm" onClick={addSpareOutside}><Plus size={13} /> Add</button>
              </div>
              {sparesOutside.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No spares purchased outside today.</div>}
              {sparesOutside.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                  <input className="form-input" placeholder="Spare name / part" value={s.name} onChange={e => updateSpareOutside(i, 'name', e.target.value)} />
                  <input className="form-input" placeholder="Qty" value={s.qty} onChange={e => updateSpareOutside(i, 'qty', e.target.value)} />
                  <input className="form-input" placeholder="Cost ₹" type="number" min="0" value={s.cost || ''} onChange={e => updateSpareOutside(i, 'cost', e.target.value)} />
                  <button type="button" className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeSpareOutside(i)}><Trash2 size={13} /></button>
                </div>
              ))}
              {sparesOutside.length > 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Total: ₹{sparesOutside.reduce((sum, s) => sum + (s.cost || 0), 0).toFixed(2)}
                </div>
              )}
            </div>

            {/* ── 6. Bill upload ── */}
            {sparesOutside.length > 0 && (
              <div style={sectionStyle}>
                <div style={sectionTitle}>
                  Upload bills <span style={{ color: 'var(--danger)' }}>*</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}> (JPG, PNG or PDF, max 5MB each)</span>
                </div>
                {/* ✅ Required notice */}
                {bills.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'var(--danger-bg)', padding: '0.4rem 0.75rem', borderRadius: 6, marginBottom: 8 }}>
                    ⚠ Bill upload is required since you added outside purchases.
                  </div>
                )}
                {formErrors.bills && (
                  <div className="form-error" style={{ marginBottom: 8 }}>{formErrors.bills}</div>
                )}
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
                <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={uploadingBill}>
                  <Upload size={14} /> {uploadingBill ? 'Uploading…' : 'Upload bill'}
                </button>
                {bills.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {bills.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}>
                        {b.type === 'application/pdf' ? <FileText size={14} color="var(--danger)" /> : <Image size={14} color="var(--info)" />}
                        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                        <button type="button" onClick={() => setBills(bl => bl.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {bills.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 6 }}>
                    ✓ {bills.length} bill{bills.length > 1 ? 's' : ''} uploaded
                  </div>
                )}
              </div>
            )}

            {/* ── 7. Spares required ── */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={sectionTitle}>Spares required <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(not available, needed)</span></div>
                <button type="button" className="btn btn-sm" onClick={addSpareRequired}><Plus size={13} /> Add</button>
              </div>
              {sparesRequired.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No spares required.</div>}
              {sparesRequired.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8 }}>
                  <input className="form-input" placeholder="Spare name" value={s.name} onChange={e => updateSpareRequired(i, 'name', e.target.value)} />
                  <input className="form-input" placeholder="Why needed / where required" value={s.reason} onChange={e => updateSpareRequired(i, 'reason', e.target.value)} />
                  <button type="button" className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeSpareRequired(i)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn" onClick={() => { setShowCheckout(false); setFormErrors({}) }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading || geoLoading}>
                {actionLoading ? 'Checking out…' : '✓ Confirm checkout'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Today's summary card */}
      <div className="card">
        <div className="card-title">Today's summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
          <div>
            <div className="text-muted text-sm">Status</div>
            <div style={{ marginTop: 4 }}>
              {!record ? <span className="badge badge-absent">Not checked in</span>
                : record.status === 'present' ? <span className="badge badge-present">Present</span>
                  : record.status === 'halfday' ? <span className="badge badge-halfday">Half day</span>
                    : <span className="badge badge-absent">Absent</span>}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Office visit</div>
            <div style={{ marginTop: 4 }}>
              {record?.checkout_time
                ? record.visited_office
                  ? <span className="badge badge-present">Visited office</span>
                  : <span className="badge badge-wfh">Remote</span>
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-in</div>
            <div style={{ marginTop: 2, fontWeight: 600 }}>{record?.checkin_time ? format(new Date(record.checkin_time), 'hh:mm a') : '—'}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Check-out</div>
            <div style={{ marginTop: 2, fontWeight: 600 }}>{record?.checkout_time ? format(new Date(record.checkout_time), 'hh:mm a') : '—'}</div>
          </div>
        </div>

        {record?.checkout_time && (
          <>
            {/* Call stats */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>Call stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {[
                  { label: 'Assigned', value: record.calls_assigned, color: 'var(--info)' },
                  { label: 'Closed', value: record.calls_closed, color: 'var(--success)' },
                  { label: 'On hold', value: record.calls_hold, color: 'var(--warning)' },
                  { label: 'Next day', value: record.calls_next_day, color: 'var(--danger)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value ?? '—'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              {record.daily_update && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '0.75rem', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Major update</div>
                  {record.daily_update}
                </div>
              )}
            </div>

            {/* Spares summary */}
            {((record.spares_from_office?.length ?? 0) > 0 || (record.spares_from_outside?.length ?? 0) > 0 || (record.spares_required?.length ?? 0) > 0) && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div className="card-title" style={{ marginBottom: '0.75rem' }}>Spares</div>
                {(record.spares_from_office?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>FROM OFFICE</div>
                    {record.spares_from_office!.map((s, i) => (
                      <div key={i} style={{ fontSize: '0.875rem', padding: '3px 0' }}>• {s.name} — {s.qty}</div>
                    ))}
                  </div>
                )}
                {(record.spares_from_outside?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>PURCHASED OUTSIDE</div>
                    {record.spares_from_outside!.map((s, i) => (
                      <div key={i} style={{ fontSize: '0.875rem', padding: '3px 0' }}>• {s.name} — {s.qty} — <strong>₹{s.cost}</strong></div>
                    ))}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Total: ₹{record.spares_from_outside!.reduce((s, x) => s + (x.cost || 0), 0).toFixed(2)}
                    </div>
                  </div>
                )}
                {(record.spares_required?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>REQUIRED (NOT AVAILABLE)</div>
                    {record.spares_required!.map((s, i) => (
                      <div key={i} style={{ fontSize: '0.875rem', padding: '3px 0' }}>• {s.name} — {s.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bills */}
            {(record.bill_urls?.length ?? 0) > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div className="card-title" style={{ marginBottom: '0.75rem' }}>Bills uploaded</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {record.bill_urls!.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.82rem', textDecoration: 'none', color: 'var(--info)' }}>
                      {url.includes('pdf') ? <FileText size={14} /> : <Image size={14} />}
                      Bill {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
