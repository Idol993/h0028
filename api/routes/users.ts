import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { role } = req.query

    let sql = 'SELECT id, name, phone, role, created_at FROM users WHERE 1=1'
    const params: any[] = []

    if (role) {
      sql += ' AND role = ?'
      params.push(role)
    }

    sql += ' ORDER BY id ASC'

    const users = db.prepare(sql).all(...params)
    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户列表失败' })
  }
})

router.post('/', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { name, phone, password, role } = req.body

    if (!name || !phone || !password || !role) {
      res.status(400).json({ success: false, error: '请提供完整的用户信息' })
      return
    }

    const validRoles = ['member', 'coach', 'admin']
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: '无效的用户角色' })
      return
    }

    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
    if (existing) {
      res.status(400).json({ success: false, error: '该手机号已被注册' })
      return
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const result = db.prepare(`
      INSERT INTO users (name, phone, password, role)
      VALUES (?, ?, ?, ?)
    `).run(name, phone, hashedPassword, role)

    const user = db.prepare('SELECT id, name, phone, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid)

    res.status(201).json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建用户失败' })
  }
})

router.put('/:id', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { name, phone, password, role } = req.body

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (phone && phone !== existing.phone) {
      const phoneExists = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, id)
      if (phoneExists) {
        res.status(400).json({ success: false, error: '该手机号已被使用' })
        return
      }
    }

    if (role) {
      const validRoles = ['member', 'coach', 'admin']
      if (!validRoles.includes(role)) {
        res.status(400).json({ success: false, error: '无效的用户角色' })
        return
      }
    }

    let hashedPassword = existing.password
    if (password) {
      hashedPassword = bcrypt.hashSync(password, 10)
    }

    db.prepare(`
      UPDATE users SET
        name = ?, phone = ?, password = ?, role = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      phone ?? existing.phone,
      hashedPassword,
      role ?? existing.role,
      id
    )

    const user = db.prepare('SELECT id, name, phone, role, created_at FROM users WHERE id = ?').get(id)

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新用户失败' })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (user.role === 'coach') {
      const classCount = db.prepare('SELECT COUNT(*) AS count FROM classes WHERE coach_id = ?').get(id) as any
      if (classCount.count > 0) {
        res.status(400).json({ success: false, error: '该教练名下还有课程，无法删除，请先调整课程安排' })
        return
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id)

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除用户失败' })
  }
})

export default router
