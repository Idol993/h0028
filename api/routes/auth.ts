import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import { authenticate, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      res.status(400).json({ success: false, error: '请提供手机号和密码' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any
    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' })
      return
    }

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) {
      res.status(401).json({ success: false, error: '密码错误' })
      return
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', authenticate, (req: Request, res: Response): void => {
  try {
    const user = db.prepare('SELECT id, name, role, phone FROM users WHERE id = ?').get(req.user!.id) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }
    res.json({ success: true, user })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
