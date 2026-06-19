import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, (req: Request, res: Response): void => {
  try {
    const { date, type, week_start } = req.query

    let sql = `
      SELECT c.*, u.name AS coach_name
      FROM classes c
      JOIN users u ON c.coach_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (week_start) {
      const ws = week_start as string
      const d = new Date(ws)
      const weekEnd = new Date(d)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const endStr = weekEnd.toISOString().slice(0, 10)
      sql += ' AND c.date >= ? AND c.date < ?'
      params.push(ws, endStr)
    } else if (date) {
      sql += ' AND c.date = ?'
      params.push(date)
    }

    if (type) {
      sql += ' AND c.type = ?'
      params.push(type)
    }

    sql += ' ORDER BY c.date, c.start_time'

    const classes = db.prepare(sql).all(...params)
    res.json({ success: true, data: classes })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程列表失败' })
  }
})

router.get('/:id', authenticate, (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const cls = db.prepare(`
      SELECT c.*, u.name AS coach_name
      FROM classes c
      JOIN users u ON c.coach_id = u.id
      WHERE c.id = ?
    `).get(id) as any

    if (!cls) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    res.json({ success: true, data: cls })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程详情失败' })
  }
})

router.post('/', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { name, type, coach_id, date, start_time, end_time, capacity } = req.body

    if (!name || !type || !coach_id || !date || !start_time || !end_time || !capacity) {
      res.status(400).json({ success: false, error: '请提供完整的课程信息' })
      return
    }

    const validTypes = ['yoga', 'boxing', 'spinning', 'pilates']
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: '无效的课程类型' })
      return
    }

    const result = db.prepare(`
      INSERT INTO classes (name, type, coach_id, date, start_time, end_time, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, type, coach_id, date, start_time, end_time, capacity)

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建课程失败' })
  }
})

router.put('/:id', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { name, type, coach_id, date, start_time, end_time, capacity } = req.body

    const existing = db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    db.prepare(`
      UPDATE classes SET
        name = ?, type = ?, coach_id = ?, date = ?, start_time = ?, end_time = ?, capacity = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      type ?? existing.type,
      coach_id ?? existing.coach_id,
      date ?? existing.date,
      start_time ?? existing.start_time,
      end_time ?? existing.end_time,
      capacity ?? existing.capacity,
      id
    )

    res.json({ success: true, message: '课程更新成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新课程失败' })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    const existing = db.prepare('SELECT * FROM classes WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }

    const bookingCount = db.prepare(
      "SELECT COUNT(*) AS count FROM bookings WHERE class_id = ? AND status = 'booked'"
    ).get(id) as any

    if (bookingCount.count > 0) {
      res.status(400).json({ success: false, error: '该课程有活跃预约，无法删除' })
      return
    }

    db.prepare('DELETE FROM classes WHERE id = ?').run(id)
    res.json({ success: true, message: '课程删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除课程失败' })
  }
})

export default router
