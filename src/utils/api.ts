import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Only auto-logout on 401 if it's NOT a known non-auth route
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''

    // Only logout if 401 AND it's not a 404 on attendance/today (no record yet)
    if (status === 401) {
      // Don't logout if token exists and this might be a false positive
      const token = localStorage.getItem('token')
      if (token) {
        // Check if token is expired by trying to parse it
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const isExpired = payload.exp * 1000 < Date.now()
          if (isExpired) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }
          // If not expired, don't auto-logout — let the component handle it
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)

export default api
