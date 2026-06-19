import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import './db.js'
import authRoutes from './routes/auth.js'
import classesRoutes from './routes/classes.js'
import bookingsRoutes from './routes/bookings.js'
import checkinsRoutes from './routes/checkins.js'
import statsRoutes from './routes/stats.js'
import rulesRoutes from './routes/rules.js'
import reportsRoutes from './routes/reports.js'
import membersRoutes from './routes/members.js'
import usersRoutes from './routes/users.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/classes', classesRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/checkins', checkinsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/rules', rulesRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/members', membersRoutes)
app.use('/api/users', usersRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
