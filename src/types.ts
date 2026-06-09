export type UserRole = 'admin' | 'employee'
export type WorkMode = 'office' | 'wfh'
export type AttendanceStatus = 'present' | 'absent' | 'halfday'
export type LeaveType = 'casual' | 'sick'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  employee_id: string
  name: string
  email: string
  role: UserRole
  department: string | null
  is_active: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  checkin_time: string | null
  checkout_time: string | null
  work_mode: WorkMode
  status: AttendanceStatus
  notes: string | null
  // Admin-only fields
  checkin_latitude?: number | null
  checkin_longitude?: number | null
  checkin_location_name?: string | null
  checkout_latitude?: number | null
  checkout_longitude?: number | null
  checkout_location_name?: string | null
  user?: User
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type: LeaveType
  from_date: string
  to_date: string
  reason: string
  status: LeaveStatus
  admin_note: string | null
  reviewed_at: string | null
  created_at: string
  user?: User
}

export interface DashboardStats {
  total_employees: number
  present_today: number
  absent_today: number
  on_leave_today: number
  wfh_today: number
}

export interface MonthlyReportRow {
  employee_id: string
  name: string
  department: string | null
  total_present: number
  total_absent: number
  total_halfday: number
  total_leave: number
  total_wfh: number
}
