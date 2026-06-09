import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Clock, Calendar, FileText,
  Users, BarChart2, LogOut, CheckSquare, List
} from 'lucide-react'

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
          <span>AttendTrack</span>
          <small>{isAdmin ? 'Admin Panel' : 'Employee Portal'}</small>
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
          <button className="btn btn-sm" style={{ width: '100%', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }} onClick={handleLogout}>
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
