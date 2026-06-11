import React, { createContext, useContext, useState, ReactNode } from 'react'
import api from '../utils/api'
import { User } from '../types'

interface AuthCtx {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  isAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem('user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.access_token)
      setUser(data.user)
      return data.user  // Return user so LoginPage can navigate immediately
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      isAdmin: user?.role === 'admin',
      loading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
