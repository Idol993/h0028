import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { processPendingDeductions } from './bookings.js'

const router = Router()

function getMemberAvailableSessions(memberId: number): number {
  return db.prepare(`
    SELECT COALESCE(SUM(remaining_sessions), 0) as total
    FROM packages
    WHERE member_id = ? AND remaining_sessions > 0 AND expires_at > datetime('now')
  `).get(memberId).total as number
}

router.post('/', authenticate, requireRole('coach', 'admin'), (req: Request, res: Response): void => {
  try {
    const { booking_id } = req.body
    const checked_by = req.user!.id

    if (!booking_id) {
      res.status(400).json({ success: false, error: '请提供预约ID' })
      return
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id) as any
    if (!booking) {
      res.status(404).json({ success: false, error: '预约不存在' })
      return
    }

    if (booking.status !== 'booked') {
      res.status(400).json({ success: false, error: '该预约状态不可签到' })
      return
    }

    const existingCheckin = db.prepare('SELECT * FROM checkins WHERE booking_id = ?').get(booking_id) as any
    if (existingCheckin) {
      res.status(400).json({ success: false, error: '该预约已签到' })
      return
    }

    processPendingDeductions(booking.member_id)

    const freshBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id) as any

    if (!freshBooking.session_deducted) {
      const available = getMemberAvailableSessions(booking.member_id)
      if (available <= 0) {
        const member = db.prepare('SELECT name FROM users WHERE id = ?').get(booking.member_id) as any
        res.status(400).json({
          success: false,
          error: `会员"${member?.name || booking.member_id}"课时不足，无法核销，请先充值课时后重试`,
          data: {
            booking_id,
            member_id: booking.member_id,
            member_name: member?.name,
            needs_deduction: true,
            available_sessions: 0,
          },
        })
        return
      }
    }

    let deductedThisTime = false

    const doCheckin = db.transaction(() => {
      if (!freshBooking.session_deducted) {
        const pkg = db.prepare(
          "SELECT * FROM packages WHERE member_id = ? AND remaining_sessions > 0 AND expires_at > datetime('now') ORDER BY expires_at ASC LIMIT 1"
        ).get(booking.member_id) as any

        if (pkg) {
          db.prepare('UPDATE packages SET remaining_sessions = remaining_sessions - 1 WHERE id = ?').run(pkg.id)
          deductedThisTime = true
        }
        db.prepare('UPDATE bookings SET session_deducted = 1 WHERE id = ?').run(booking_id)
      }

      db.prepare(
        'INSERT INTO checkins (booking_id, checked_by) VALUES (?, ?)'
      ).run(booking_id, checked_by)

      db.prepare(
        "UPDATE bookings SET status = 'completed' WHERE id = ?"
      ).run(booking_id)

      db.prepare(
        "DELETE FROM no_show_records WHERE booking_id = ?"
      ).run(booking_id)
    })

    doCheckin()

    res.json({
      success: true,
      message: '签到成功',
      data: {
        booking_id,
        member_id: booking.member_id,
        already_deducted_before: freshBooking.session_deducted === 1,
        deducted_this_time: deductedThisTime,
        final_status: 'completed',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '签到失败' })
  }
})

router.post('/attendance/:classId', authenticate, requireRole('coach', 'admin'), (req: Request, res: Response): void => {
  try {
    const { classId } = req.params
    const { actual_count } = req.body

    if (actual_count === undefined || actual_count === null) {
      res.status(400).json({ success: false, error: '请提供实际到场人数' })
      return
    }

    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId) as any
    if (!cls) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    const allBookings = db.prepare(
      "SELECT b.*, u.name AS member_name FROM bookings b JOIN users u ON b.member_id = u.id WHERE b.class_id = ? AND b.status IN ('booked', 'completed') ORDER BY b.id"
    ).all(classId) as any[]

    if (allBookings.length === 0) {
      db.prepare('UPDATE classes SET actual_count = ? WHERE id = ?').run(actual_count, classId)
      res.json({
        success: true,
        data: {
          class_id: classId,
          actual_count,
          booked_count: cls.booked_count,
          checked_in_count: 0,
          no_show_count: 0,
          attendance_rate: 0,
          warning: false,
          total_deducted_this_time: 0,
          total_deduction_skipped: 0,
          insufficient_members: [],
          deduction_details: [],
        },
      })
      return
    }

    const memberIds = [...new Set(allBookings.map(b => b.member_id))]
    for (const mid of memberIds) {
      processPendingDeductions(mid)
    }

    const freshBookings = db.prepare(
      "SELECT b.*, u.name AS member_name FROM bookings b JOIN users u ON b.member_id = u.id WHERE b.class_id = ? AND b.status IN ('booked', 'completed') ORDER BY b.id"
    ).all(classId) as any[]

    const alreadyCheckedIn = freshBookings.filter(b => b.status === 'completed')
    const stillBooked = freshBookings.filter(b => b.status === 'booked')

    const needDeductionBookings = freshBookings.filter(b => !b.session_deducted)
    const memberSessionCheck = new Map<number, { available: number; needed: number; name: string }>()

    for (const b of needDeductionBookings) {
      const existing = memberSessionCheck.get(b.member_id)
      if (!existing) {
        const available = getMemberAvailableSessions(b.member_id)
        memberSessionCheck.set(b.member_id, { available, needed: 1, name: b.member_name })
      } else {
        existing.needed++
      }
    }

    const insufficientMembers: any[] = []
    for (const [memberId, info] of memberSessionCheck) {
      if (info.available < info.needed) {
        insufficientMembers.push({
          member_id: memberId,
          member_name: info.name,
          available_sessions: info.available,
          sessions_needed: info.needed,
        })
      }
    }

    if (insufficientMembers.length > 0) {
      res.status(400).json({
        success: false,
        error: `${insufficientMembers.map(m => `会员"${m.member_name}"需要${m.sessions_needed}课时但仅剩${m.available_sessions}课时`).join('；')}，出勤录入失败，请先为相关会员充值课时`,
        data: {
          class_id: classId,
          insufficient_members: insufficientMembers,
          already_deducted_bookings: freshBookings.filter(b => b.session_deducted).map(b => ({
            booking_id: b.id,
            member_id: b.member_id,
            member_name: b.member_name,
            status: b.status,
            already_deducted: true,
          })),
          need_deduction_bookings: needDeductionBookings.map(b => ({
            booking_id: b.id,
            member_id: b.member_id,
            member_name: b.member_name,
            status: b.status,
            already_deducted: false,
          })),
        },
      })
      return
    }

    const month = cls.date.slice(0, 7)
    const deductionDetails: any[] = []
    let totalDeductedThisTime = 0

    const processAll = db.transaction(() => {
      db.prepare('UPDATE classes SET actual_count = ? WHERE id = ?').run(actual_count, classId)

      for (const booking of alreadyCheckedIn) {
        let deducted = false
        if (!booking.session_deducted) {
          const pkg = db.prepare(
            "SELECT * FROM packages WHERE member_id = ? AND remaining_sessions > 0 AND expires_at > datetime('now') ORDER BY expires_at ASC LIMIT 1"
          ).get(booking.member_id) as any
          if (pkg) {
            db.prepare('UPDATE packages SET remaining_sessions = remaining_sessions - 1 WHERE id = ?').run(pkg.id)
            deducted = true
            totalDeductedThisTime++
          }
          db.prepare('UPDATE bookings SET session_deducted = 1 WHERE id = ?').run(booking.id)
        }
        deductionDetails.push({
          booking_id: booking.id,
          member_id: booking.member_id,
          member_name: booking.member_name,
          result: 'completed',
          deducted_this_time: deducted,
          already_deducted_before: booking.session_deducted === 1,
        })
      }

      for (const booking of stillBooked) {
        let deducted = false
        if (!booking.session_deducted) {
          const pkg = db.prepare(
            "SELECT * FROM packages WHERE member_id = ? AND remaining_sessions > 0 AND expires_at > datetime('now') ORDER BY expires_at ASC LIMIT 1"
          ).get(booking.member_id) as any
          if (pkg) {
            db.prepare('UPDATE packages SET remaining_sessions = remaining_sessions - 1 WHERE id = ?').run(pkg.id)
            deducted = true
            totalDeductedThisTime++
          }
          db.prepare('UPDATE bookings SET session_deducted = 1 WHERE id = ?').run(booking.id)
        }

        db.prepare("UPDATE bookings SET status = 'no_show' WHERE id = ?").run(booking.id)
        db.prepare(
          'INSERT OR IGNORE INTO no_show_records (member_id, booking_id, month) VALUES (?, ?, ?)'
        ).run(booking.member_id, booking.id, month)

        deductionDetails.push({
          booking_id: booking.id,
          member_id: booking.member_id,
          member_name: booking.member_name,
          result: 'no_show',
          deducted_this_time: deducted,
          already_deducted_before: booking.session_deducted === 1,
        })
      }
    })

    processAll()

    const attendanceRate = cls.booked_count > 0 ? actual_count / cls.booked_count : 0
    const warning = attendanceRate < 0.5

    const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get() as any
    const threshold = rules?.no_show_threshold ?? 3
    const suspendWeeks = rules?.suspend_weeks ?? 1

    const noShowMembers = db.prepare(`
      SELECT member_id, COUNT(*) AS no_show_count
      FROM no_show_records
      WHERE month = ?
      GROUP BY member_id
      HAVING no_show_count >= ?
    `).all(month, threshold) as any[]

    const now = new Date()
    for (const m of noShowMembers) {
      const weekStart = new Date(now)
      const day = weekStart.getDay()
      const diff = day === 0 ? -6 : 1 - day
      weekStart.setDate(weekStart.getDate() + diff + 7)
      const weekStr = weekStart.toISOString().slice(0, 10)

      const existingSuspension = db.prepare(
        'SELECT * FROM suspensions WHERE member_id = ? AND week = ?'
      ).get(m.member_id, weekStr) as any

      if (!existingSuspension) {
        db.prepare(
          'INSERT INTO suspensions (member_id, week, reason) VALUES (?, ?, ?)'
        ).run(
          m.member_id,
          weekStr,
          `${month}月累计${m.no_show_count}次缺席，停约${suspendWeeks}周`
        )
      }
    }

    res.json({
      success: true,
      data: {
        class_id: classId,
        actual_count,
        booked_count: cls.booked_count,
        checked_in_count: alreadyCheckedIn.length,
        no_show_count: stillBooked.length,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        warning,
        total_deducted_this_time: totalDeductedThisTime,
        total_deduction_skipped: 0,
        insufficient_members: [],
        suspensions_created: noShowMembers.length,
        deduction_details: deductionDetails,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '记录出勤失败' })
  }
})

export default router
