export type UserRole = 'member' | 'coach' | 'admin'
export type ClassType = 'yoga' | 'boxing' | 'spinning' | 'pilates'
export type BookingStatus = 'booked' | 'cancelled' | 'completed' | 'no_show'

export interface User {
  id: number
  name: string
  phone: string
  role: UserRole
}

export interface GymClass {
  id: number
  name: string
  type: ClassType
  coach_id: number
  coach_name: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
  actual_count: number | null
  created_at: string
}

export interface Booking {
  id: number
  member_id: number
  class_id: number
  status: BookingStatus
  booked_at: string
  cancelled_at: string | null
  class_info?: GymClass
  member_name?: string
}

export interface Checkin {
  id: number
  booking_id: number
  checked_by: number
  checked_at: string
}

export interface Package {
  id: number
  member_id: number
  total_sessions: number
  remaining_sessions: number
  expires_at: string
  created_at: string
}

export interface Rules {
  id: number
  no_show_threshold: number
  suspend_weeks: number
  cancel_hours_before: number
}

export interface AttendanceStat {
  type: string
  rate: number
  isWarning: boolean
  totalClasses: number
  totalBooked: number
  totalAttended: number
}

export interface NoShowRecord {
  memberId: number
  name: string
  phone: string
  count: number
  isSuspended: boolean
}

export interface CoachStat {
  coachId: number
  name: string
  classCount: number
  avgAttendance: number
}
