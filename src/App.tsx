import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Shell from './components/Shell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AttendanceHistoryPage from './pages/AttendanceHistoryPage'
import LeaveApplyPage from './pages/LeaveApplyPage'
import LeaveHistoryPage from './pages/LeaveHistoryPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminLeavePage from './pages/admin/AdminLeavePage'
import AdminAttendancePage from './pages/admin/AdminAttendancePage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import './index.css'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><Shell /></RequireAuth>}>
        {/* Employee routes */}
        <Route index element={<Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="attendance" element={<AttendanceHistoryPage />} />
        <Route path="leave/apply" element={<LeaveApplyPage />} />
        <Route path="leave/history" element={<LeaveHistoryPage />} />
        {/* Admin routes */}
        <Route path="admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="admin/leave" element={<RequireAdmin><AdminLeavePage /></RequireAdmin>} />
        <Route path="admin/attendance" element={<RequireAdmin><AdminAttendancePage /></RequireAdmin>} />
        <Route path="admin/reports" element={<RequireAdmin><AdminReportsPage /></RequireAdmin>} />
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
