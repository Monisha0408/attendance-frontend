import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Shell from './components/Shell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AttendanceHistoryPage from './pages/AttendanceHistoryPage'
import LeaveApplyPage from './pages/LeaveApplyPage'
import LeaveHistoryPage from './pages/LeaveHistoryPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminLeavePage from './pages/admin/AdminLeavePage'
import AdminAttendancePage from './pages/admin/AdminAttendancePage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminDailyUpdatesPage from './pages/admin/AdminDailyUpdatesPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import './index.css'

// Always read from localStorage fresh — context state may lag on refresh
function getUser() {
  try {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  } catch { return null }
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  // Use context user first (most up to date), fall back to localStorage
  const resolved = user ?? getUser()
  if (!resolved) return <Navigate to="/login" replace />
  // ✅ Only force change-password if flag is true AND token exists
  // This prevents redirect loops on refresh
  if (resolved.must_change_password && localStorage.getItem('token')) {
    return <Navigate to="/change-password" replace />
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const resolved = user ?? getUser()
  if (!resolved) return <Navigate to="/login" replace />
  if (resolved.must_change_password && localStorage.getItem('token')) {
    return <Navigate to="/change-password" replace />
  }
  if (resolved.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const resolved = user ?? getUser()
  if (!resolved) return <Navigate to="/login" replace />
  if (resolved.must_change_password && localStorage.getItem('token')) {
    return <Navigate to="/change-password" replace />
  }
  if (!resolved.is_superadmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  const resolved = user ?? getUser()
  const homeRoute = resolved?.role === 'admin' ? '/admin' : '/dashboard'
  const mustChange = resolved?.must_change_password && localStorage.getItem('token')

  return (
    <Routes>
      <Route path="/login"
        element={resolved
          ? <Navigate to={mustChange ? '/change-password' : homeRoute} replace />
          : <LoginPage />}
      />
      {/* Change password — full screen when forced, in Shell when optional */}
      <Route path="/change-password"
        element={resolved
          ? mustChange
            ? <ChangePasswordPage />
            : <Shell><ChangePasswordPage /></Shell>
          : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<RequireAuth><Shell /></RequireAuth>}>
        <Route index element={<Navigate to={homeRoute} replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="attendance" element={<AttendanceHistoryPage />} />
        <Route path="leave/apply" element={<LeaveApplyPage />} />
        <Route path="leave/history" element={<LeaveHistoryPage />} />
        <Route path="admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="admin/leave" element={<RequireAdmin><AdminLeavePage /></RequireAdmin>} />
        <Route path="admin/attendance" element={<RequireAdmin><AdminAttendancePage /></RequireAdmin>} />
        <Route path="admin/reports" element={<RequireAdmin><AdminReportsPage /></RequireAdmin>} />
        <Route path="admin/daily-updates" element={<RequireAdmin><AdminDailyUpdatesPage /></RequireAdmin>} />
        <Route path="admin/audit" element={<RequireSuperAdmin><AuditLogsPage /></RequireSuperAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
