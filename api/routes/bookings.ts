import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function getWeekOfDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

export function processPendingDeductions(memberId: number): void {
  const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get() as any
  const cancelHours = rules?.cancel_hours_before ?? 2

  const pendingBookings = db.prepare(`
    SELECT b.id, b.class_id, c.date, c.start_time
    FROM bookings b
    JOIN classes c ON b.class_id = c.id
    WHERE b.member_id = ? AND b.status = 'booked' AND b.session_deducted = 0
  `).all(memberId) as any[]

  const now = new Date()

  for (const booking of pendingBookings) {
    const classDateTime = new Date(`${booking.date}T${booking.start_time}`)
    const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours <= cancelHours) {
      const pkg = db.prepare(
        "SELECT * FROM packages WHERE member_id = ? AND remaining_sessions > 0 AND expires_at > datetime('now') ORDER BY expires_at ASC LIMIT 1"
      ).get(memberId) as any

      if (pkg) {
        const deduct = db.transaction(() => {
          db.prepare(
            'UPDATE packages SET remaining_sessions = remaining_sessions - 1 WHERE id = ?'
          ).run(pkg.id)

          db.prepare(
            'UPDATE bookings SET session_deducted = 1 WHERE id = ?'
          ).run(booking.id)
        })
        deduct()
      }
    }
  }
}

router.post('/', authenticate, (req: Request, res: Response): void => {
  try {
    const member_id = req.user!.id
    const { class_id } = req.body

    if (!class_id) {
      res.status(400).json({ success: false, error: '请提供课程ID' })
      return
    }

    if (req.user!.role !== 'member') {
      res.status(403).json({ success: false, error: '仅会员可预约课程' })
      return
    }

    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(class_id) as any
    if (!cls) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    const classWeek = getWeekOfDate(cls.date)
    const suspension = db.prepare(
      'SELECT * FROM suspensions WHERE member_id = ? AND week = ?'
    ).get(member_id, classWeek) as any

    if (suspension) {
      res.status(403).json({ success: false, error: '您该周已被停约，无法预约课程' })
      return
    }

    processPendingDeductions(member_id)

    const totalRemaining = db.prepare(`
      SELECT COALESCE(SUM(remaining_sessions), 0) as total
      FROM packages
      WHERE member_id = ? AND remaining_sessions > 0 AND expires_at > datetime('now')
    `).get(member_id).total as number

    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE member_id = ? AND status = 'booked' AND session_deducted = 0
    `).get(member_id).count as number

    if (totalRemaining - pendingCount <= 0) {
      res.status(400).json({ success: false, error: '您没有可用的课时' })
      return
    }

    if (cls.booked_count >= cls.capacity) {
      res.status(400).json({ success: false, error: '课程已满' })
      return
    }

    const existingBooking = db.prepare(
      "SELECT * FROM bookings WHERE member_id = ? AND class_id = ? AND status != 'cancelled'"
    ).get(member_id, class_id) as any

    if (existingBooking) {
      res.status(400).json({ success: false, error: '您已预约该课程' })
      return
    }

    const createBooking = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO bookings (member_id, class_id, session_deducted) VALUES (?, ?, 0)'
      ).run(member_id, class_id)

      db.prepare(
        'UPDATE classes SET booked_count = booked_count + 1 WHERE id = ?'
      ).run(class_id)

      return result
    })

    const result = createBooking()
    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (error) {
    res.status(500).json({ success: false, error: '预约失败' })
  }
})

router.delete('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const member_id = req.user!.id

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any
    if (!booking) {
      res.status(404).json({ success: false, error: '预约不存在' })
      return
    }

    if (booking.member_id !== member_id && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权取消该预约' })
      return
    }

    if (booking.status !== 'booked') {
      res.status(400).json({ success: false, error: '只能取消状态为已预约的记录' })
      return
    }

    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(booking.class_id) as any
    if (!cls) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get() as any
    const cancelHours = rules?.cancel_hours_before ?? 2

    const classDateTime = new Date(`${cls.date}T${cls.start_time}`)
    const now = new Date()
    const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours < cancelHours) {
      res.status(400).json({
        success: false,
        error: `课程开始前${cancelHours}小时内不可取消`,
      })
      return
    }

    const cancelBooking = db.transaction(() => {
      db.prepare(
        "UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?"
      ).run(id)

      db.prepare(
        'UPDATE classes SET booked_count = booked_count - 1 WHERE id = ?'
      ).run(booking.class_id)

      if (booking.session_deducted) {
        const pkg = db.prepare(
          "SELECT * FROM packages WHERE member_id = ? AND total_sessions > remaining_sessions AND expires_at > datetime('now') ORDER BY expires_at ASC LIMIT 1"
        ).get(booking.member_id) as any

        if (pkg) {
          db.prepare(
            'UPDATE packages SET remaining_sessions = remaining_sessions + 1 WHERE id = ?'
          ).run(pkg.id)
        }
      }
    })

    cancelBooking()
    res.json({ success: true, message: '取消预约成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '取消预约失败' })
  }
})

router.get('/my', authenticate, (req: Request, res: Response): void => {
  try {
    const member_id = req.user!.id
    const { status } = req.query

    processPendingDeductions(member_id)

    let sql = `
      SELECT b.*, c.name AS class_name, c.type AS class_type, c.date, c.start_time, c.end_time,
             u.name AS coach_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON c.coach_id = u.id
      WHERE b.member_id = ?
    `
    const params: any[] = [member_id]

    if (status) {
      sql += ' AND b.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY c.date DESC, c.start_time DESC'

    const bookings = db.prepare(sql).all(...params)
    res.json({ success: true, data: bookings })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取预约列表失败' })
  }
})

router.get('/class/:classId', authenticate, (req: Request, res: Response): void => {
  try {
    const { classId } = req.params
    const role = req.user!.role

    if (role !== 'coach' && role !== 'admin') {
      res.status(403).json({ success: false, error: '仅教练和管理员可查看课程预约' })
      return
    }

    const bookings = db.prepare(`
      SELECT b.*, u.name AS member_name, u.phone AS member_phone
      FROM bookings b
      JOIN users u ON b.member_id = u.id
      WHERE b.class_id = ?
      ORDER BY b.booked_at DESC
    `).all(classId)

    res.json({ success: true, data: bookings })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程预约失败' })
  }
})

export default router
