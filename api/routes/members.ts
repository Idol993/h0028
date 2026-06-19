import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/my/packages', authenticate, (req: Request, res: Response): void => {
  try {
    const member_id = req.user!.id

    const packages = db.prepare(`
      SELECT * FROM packages WHERE member_id = ? ORDER BY expires_at ASC
    `).all(member_id)

    res.json({ success: true, data: packages })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课时包失败' })
  }
})

router.get('/my/records', authenticate, (req: Request, res: Response): void => {
  try {
    const member_id = req.user!.id
    const { start_date, end_date } = req.query

    let sql = `
      SELECT b.*, c.name AS class_name, c.type AS class_type, c.date, c.start_time, c.end_time,
             u.name AS coach_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON c.coach_id = u.id
      WHERE b.member_id = ?
    `
    const params: any[] = [member_id]

    if (start_date) {
      sql += ' AND c.date >= ?'
      params.push(start_date)
    }
    if (end_date) {
      sql += ' AND c.date <= ?'
      params.push(end_date)
    }

    sql += ' ORDER BY c.date DESC, c.start_time DESC'

    const records = db.prepare(sql).all(...params)
    res.json({ success: true, data: records })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取上课记录失败' })
  }
})

router.get('/my/records/export', authenticate, (req: Request, res: Response): void => {
  try {
    const member_id = req.user!.id
    const { start_date, end_date } = req.query

    let sql = `
      SELECT b.status, c.name AS class_name, c.type AS class_type, c.date, c.start_time, c.end_time,
             u.name AS coach_name, b.booked_at
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON c.coach_id = u.id
      WHERE b.member_id = ?
    `
    const params: any[] = [member_id]

    if (start_date) {
      sql += ' AND c.date >= ?'
      params.push(start_date)
    }
    if (end_date) {
      sql += ' AND c.date <= ?'
      params.push(end_date)
    }

    sql += ' ORDER BY c.date DESC, c.start_time DESC'

    const records = db.prepare(sql).all(...params) as any[]

    const typeMap: Record<string, string> = {
      yoga: '瑜伽',
      boxing: '搏击',
      spinning: '动感单车',
      pilates: '普拉提',
    }

    const statusMap: Record<string, string> = {
      booked: '已预约',
      cancelled: '已取消',
      completed: '已完成',
      no_show: '缺席',
    }

    const header = '课程名称,课程类型,日期,开始时间,结束时间,教练,状态,预约时间'
    const rows = records.map(r =>
      `${r.class_name},${typeMap[r.class_type] || r.class_type},${r.date},${r.start_time},${r.end_time},${r.coach_name},${statusMap[r.status] || r.status},${r.booked_at}`
    )

    const csv = '\uFEFF' + [header, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=member-records.csv')
    res.send(csv)
  } catch (error) {
    res.status(500).json({ success: false, error: '导出记录失败' })
  }
})

export default router
