import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

export default function PWAPrompt() {
  const [prompt, setPrompt] = useState<any>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_dismissed')
    if (dismissed) return

    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      setTimeout(() => setShown(true), 3000) // show after 3s
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setShown(false)
    setPrompt(null)
    if (outcome === 'accepted') localStorage.setItem('pwa_installed', '1')
    else localStorage.setItem('pwa_dismissed', '1')
  }

  const dismiss = () => {
    setShown(false)
    localStorage.setItem('pwa_dismissed', '1')
  }

  if (!shown || !prompt) return null

  return (
    <div style={{
      position: 'fixed', bottom: 70, left: 16, right: 16, zIndex: 200,
      background: '#16213E', border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{ width: 40, height: 40, background: '#B91C1C', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Download size={20} color="#fff" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#EEF2FF', fontSize: '0.875rem', fontWeight: 600 }}>Add to home screen</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Use CB Enterprises like a native app</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={dismiss} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>
          Not now
        </button>
        <button onClick={install} style={{ background: '#3B82F6', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
          Install
        </button>
      </div>
    </div>
  )
}
