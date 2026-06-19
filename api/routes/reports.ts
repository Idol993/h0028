import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/monthly', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { month } = req.query
    const targetMonth = (month as string) || new Date().toISOString().slice(0, 7)

    const classes = db.prepare(`
      SELECT
        c.name,
        c.type,
        c.date,
        u.name AS coach_name,
        c.capacity,
        c.booked_count,
        COALESCE(c.actual_count, 0) AS actual_count,
        CASE
          WHEN c.booked_count > 0
          THEN CAST(COALESCE(c.actual_count, 0) AS REAL) / c.booked_count
          ELSE 0
        END AS attendance_rate
      FROM classes c
      JOIN users u ON c.coach_id = u.id
      WHERE strftime('%Y-%m', c.date) = ?
      ORDER BY c.date, c.start_time
    `).all(targetMonth) as any[]

    const typeMap: Record<string, string> = {
      yoga: '瑜伽',
      boxing: '搏击',
      spinning: '动感单车',
      pilates: '普拉提',
    }

    const header = '课程名称,课程类型,日期,教练,容量,预约数,到场数,出勤率'
    const rows = classes.map(c =>
      `${c.name},${typeMap[c.type] || c.type},${c.date},${c.coach_name},${c.capacity},${c.booked_count},${c.actual_count},${(Math.round(c.attendance_rate * 10000) / 100).toFixed(2)}%`
    )

    const csv = '\uFEFF' + [header, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=monthly-report-${targetMonth}.csv`)
    res.send(csv)
  } catch (error) {
    res.status(500).json({ success: false, error: '导出月度报告失败' })
  }
})

export default router
