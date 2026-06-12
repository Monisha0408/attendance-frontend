import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Keep Render backend warm — ping every 9 minutes
// Render spins down after 15 min inactivity, this prevents it
const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000'
setInterval(() => {
  fetch(`${BACKEND}/health`, { method: 'GET' }).catch(() => {})
}, 9 * 60 * 1000)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
