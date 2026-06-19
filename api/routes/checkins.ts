import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

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

    const doCheckin = db.transaction(() => {
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
    res.json({ success: true, message: '签到成功' })
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

    db.prepare('UPDATE classes SET actual_count = ? WHERE id = ?').run(actual_count, classId)

    const attendanceRate = cls.booked_count > 0 ? actual_count / cls.booked_count : 0
    const warning = attendanceRate < 0.5

    const bookedBookings = db.prepare(
      "SELECT * FROM bookings WHERE class_id = ? AND status = 'booked'"
    ).all(classId) as any[]

    const month = cls.date.slice(0, 7)

    const processNoShows = db.transaction(() => {
      for (const booking of bookedBookings) {
        db.prepare(
          "UPDATE bookings SET status = 'no_show' WHERE id = ?"
        ).run(booking.id)

        db.prepare(
          'INSERT OR IGNORE INTO no_show_records (member_id, booking_id, month) VALUES (?, ?, ?)'
        ).run(booking.member_id, booking.id, month)
      }
    })

    processNoShows()

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
      weekStart.setDate(weekStart.getDate() + diff)
      const weekStr = weekStart.toISOString().slice(0, 10)

      const existingSuspension = db.prepare(
        'SELECT * FROM suspensions WHERE member_id = ? AND week = ?'
      ).get(m.member_id, weekStr) as any

      if (!existingSuspension) {
        const suspendUntil = new Date(weekStart)
        suspendUntil.setDate(suspendUntil.getDate() + suspendWeeks * 7)
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
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        warning,
        no_shows_flagged: bookedBookings.length,
        suspensions_created: noShowMembers.length,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '记录出勤失败' })
  }
})

export default router
