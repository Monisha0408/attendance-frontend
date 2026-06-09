import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Clock, Calendar, FileText,
  Users, BarChart2, LogOut, CheckSquare, List
} from 'lucide-react'

function CBOwlLogo() {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="sidebar-logo-icon">
      {/* Wings */}
      <path d="M5 28 C8 18, 18 14, 22 20 L18 30 C14 26, 8 26, 5 28Z" fill="#2563EB"/>
      <path d="M55 28 C52 18, 42 14, 38 20 L42 30 C46 26, 52 26, 55 28Z" fill="#2563EB"/>
      <path d="M3 35 C6 24, 16 20, 22 26 L17 36 C13 30, 6 30, 3 35Z" fill="#1D4ED8" opacity="0.7"/>
      <path d="M57 35 C54 24, 44 20, 38 26 L43 36 C47 30, 54 30, 57 35Z" fill="#1D4ED8" opacity="0.7"/>
      {/* Body */}
      <ellipse cx="30" cy="36" rx="14" ry="16" fill="#B91C1C"/>
      {/* Head */}
      <circle cx="30" cy="22" r="12" fill="#B91C1C"/>
      {/* Ear tufts */}
      <path d="M22 13 L20 7 L25 12Z" fill="#9B1B1B"/>
      <path d="M38 13 L40 7 L35 12Z" fill="#9B1B1B"/>
      {/* Face */}
      <ellipse cx="30" cy="23" rx="8" ry="7" fill="#F5E6C8"/>
      {/* Eyes */}
      <circle cx="26" cy="21" r="3.5" fill="white"/>
      <circle cx="34" cy="21" r="3.5" fill="white"/>
      <circle cx="26" cy="21" r="2" fill="#1a1a1a"/>
      <circle cx="34" cy="21" r="2" fill="#1a1a1a"/>
      <circle cx="27" cy="20" r="0.6" fill="white"/>
      <circle cx="35" cy="20" r="0.6" fill="white"/>
      {/* Beak */}
      <path d="M28 25 L30 28 L32 25Z" fill="#E97316"/>
      {/* Chest pattern */}
      <ellipse cx="30" cy="40" rx="7" ry="9" fill="#9B1B1B" opacity="0.5"/>
      {/* Feet */}
      <path d="M24 51 L22 55 M24 51 L24 55 M24 51 L26 55" stroke="#E97316" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M36 51 L34 55 M36 51 L36 55 M36 51 L38 55" stroke="#E97316" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

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
          <CBOwlLogo />
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
