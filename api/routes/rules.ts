import { Router, type Request, type Response } from 'express'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, (_req: Request, res: Response): void => {
  try {
    const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get()
    res.json({ success: true, data: rules })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取规则失败' })
  }
})

router.put('/', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { no_show_threshold, suspend_weeks, cancel_hours_before } = req.body

    const current = db.prepare('SELECT * FROM rules WHERE id = 1').get() as any
    if (!current) {
      res.status(404).json({ success: false, error: '规则不存在' })
      return
    }

    db.prepare(`
      UPDATE rules SET
        no_show_threshold = ?,
        suspend_weeks = ?,
        cancel_hours_before = ?
      WHERE id = 1
    `).run(
      no_show_threshold ?? current.no_show_threshold,
      suspend_weeks ?? current.suspend_weeks,
      cancel_hours_before ?? current.cancel_hours_before
    )

    res.json({ success: true, message: '规则更新成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新规则失败' })
  }
})

export default router
