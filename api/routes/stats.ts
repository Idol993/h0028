import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/attendance', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const stats = db.prepare(`
      SELECT
        c.type,
        COUNT(*) AS total_classes,
        SUM(c.booked_count) AS total_booked,
        SUM(COALESCE(c.actual_count, 0)) AS total_attended,
        CASE
          WHEN SUM(c.booked_count) > 0
          THEN CAST(SUM(COALESCE(c.actual_count, 0)) AS REAL) / SUM(c.booked_count)
          ELSE 0
        END AS attendance_rate
      FROM classes c
      WHERE c.actual_count IS NOT NULL
      GROUP BY c.type
    `).all() as any[]

    const result = stats.map(s => ({
      ...s,
      attendance_rate: Math.round(s.attendance_rate * 100) / 100,
      warning: s.attendance_rate < 0.5,
    }))

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取出勤统计失败' })
  }
})

router.get('/no-shows', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const month = new Date().toISOString().slice(0, 7)

    const noShows = db.prepare(`
      SELECT
        ns.member_id,
        u.name AS member_name,
        u.phone,
        ns.month,
        COUNT(*) AS no_show_count
      FROM no_show_records ns
      JOIN users u ON ns.member_id = u.id
      WHERE ns.month = ?
      GROUP BY ns.member_id
      ORDER BY no_show_count DESC
    `).all(month) as any[]

    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() + diff)
    const weekStr = weekStart.toISOString().slice(0, 10)

    const result = noShows.map(ns => {
      const suspension = db.prepare(
        'SELECT * FROM suspensions WHERE member_id = ? AND week = ?'
      ).get(ns.member_id, weekStr) as any

      return {
        ...ns,
        suspended: !!suspension,
        suspension_reason: suspension?.reason ?? null,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取缺席统计失败' })
  }
})

router.get('/coaches', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const coaches = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.phone,
        COUNT(c.id) AS class_count,
        CASE
          WHEN COUNT(c.id) > 0 AND SUM(c.booked_count) > 0
          THEN CAST(SUM(COALESCE(c.actual_count, 0)) AS REAL) / SUM(c.booked_count)
          ELSE 0
        END AS avg_attendance_rate
      FROM users u
      LEFT JOIN classes c ON u.id = c.coach_id
      WHERE u.role = 'coach'
      GROUP BY u.id
      ORDER BY class_count DESC
    `).all() as any[]

    const result = coaches.map(c => ({
      ...c,
      avg_attendance_rate: Math.round(c.avg_attendance_rate * 100) / 100,
    }))

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取教练统计失败' })
  }
})

export default router
