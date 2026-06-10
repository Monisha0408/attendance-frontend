import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Clock, Calendar, FileText,
  Users, BarChart2, LogOut, CheckSquare, List
} from 'lucide-react'

const CB_LOGO = 'data:image/png;base64,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'

export default function Shell() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const employeeLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: Clock, label: 'My Attendance' },
    { to: '/leave/apply', icon: Calendar, label: 'Apply Leave' },
    { to: '/leave/history', icon: FileText, label: 'Leave History' },
  ]

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Employees' },
    { to: '/admin/attendance', icon: CheckSquare, label: 'Attendance' },
    { to: '/admin/leave', icon: List, label: 'Leave Requests' },
    { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
  ]

  const links = isAdmin ? adminLinks : employeeLinks

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={CB_LOGO} alt="CB Enterprises" className="sidebar-logo-icon" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div className="sidebar-logo-text">
            <span>CB Enterprises</span>
            <small>Staff Portal</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/dashboard'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            {user?.employee_id}
          </div>
          <button
            className="btn btn-sm"
            style={{ width: '100%', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            onClick={handleLogout}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
