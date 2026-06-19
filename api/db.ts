import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, 'gym.db')

const SQL = await initSqlJs()

let dbData: Buffer | undefined
if (fs.existsSync(dbPath)) {
  dbData = fs.readFileSync(dbPath)
}

const database = new SQL.Database(dbData)

function saveDb() {
  const data = database.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = database.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function queryGet(sql: string, params: any[] = []): any {
  const stmt = database.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  let result: any = undefined
  if (stmt.step()) {
    result = stmt.getAsObject()
  }
  stmt.free()
  return result
}

function queryRun(sql: string, params: any[] = []): { lastInsertRowid: number | bigint; changes: number } {
  database.run(sql, params)
  return {
    lastInsertRowid: database.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] ?? 0,
    changes: database.getRowsModified(),
  }
}

const db = {
  prepare(sql: string) {
    return {
      get(...params: any[]) {
        return queryGet(sql, params)
      },
      all(...params: any[]) {
        return queryAll(sql, params)
      },
      run(...params: any[]) {
        return queryRun(sql, params)
      },
    }
  },
  exec(sql: string) {
    database.exec(sql)
    saveDb()
  },
  transaction<T extends (...args: any[]) => any>(fn: T): T {
    const wrapped = (...args: any[]) => {
      database.run('BEGIN TRANSACTION')
      try {
        const result = fn(...args)
        database.run('COMMIT')
        saveDb()
        return result
      } catch (error) {
        database.run('ROLLBACK')
        throw error
      }
    }
    return wrapped as T
  },
}

database.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('member', 'coach', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('yoga', 'boxing', 'spinning', 'pilates')),
  coach_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  booked_count INTEGER NOT NULL DEFAULT 0,
  actual_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  status TEXT NOT NULL CHECK(status IN ('booked', 'cancelled', 'completed', 'no_show')) DEFAULT 'booked',
  booked_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at TEXT,
  UNIQUE(member_id, class_id)
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  checked_by INTEGER NOT NULL REFERENCES users(id),
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id),
  total_sessions INTEGER NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS no_show_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id),
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  month TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suspensions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES users(id),
  week TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no_show_threshold INTEGER NOT NULL DEFAULT 3,
  suspend_weeks INTEGER NOT NULL DEFAULT 1,
  cancel_hours_before INTEGER NOT NULL DEFAULT 2
);
`)

database.exec(`
CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date);
CREATE INDEX IF NOT EXISTS idx_classes_type ON classes(type);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_class ON bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_no_show_member_month ON no_show_records(member_id, month);
CREATE INDEX IF NOT EXISTS idx_packages_member ON packages(member_id);
`)

const hashAdmin = bcrypt.hashSync('admin123', 10)
const hashCoach = bcrypt.hashSync('coach123', 10)
const hashMember = bcrypt.hashSync('member123', 10)

const existingUsers = queryAll('SELECT COUNT(*) as count FROM users')
if (existingUsers[0]?.count === 0) {
  database.run('INSERT INTO users (id, name, phone, password, role) VALUES (1, ?, ?, ?, ?)', ['管理员', '13800000000', hashAdmin, 'admin'])
  database.run('INSERT INTO users (id, name, phone, password, role) VALUES (2, ?, ?, ?, ?)', ['王教练', '13800000001', hashCoach, 'coach'])
  database.run('INSERT INTO users (id, name, phone, password, role) VALUES (3, ?, ?, ?, ?)', ['李教练', '13800000002', hashCoach, 'coach'])
  database.run('INSERT INTO users (id, name, phone, password, role) VALUES (4, ?, ?, ?, ?)', ['张会员', '13800000003', hashMember, 'member'])
  database.run('INSERT INTO users (id, name, phone, password, role) VALUES (5, ?, ?, ?, ?)', ['赵会员', '13800000004', hashMember, 'member'])

  database.run('INSERT INTO rules (id, no_show_threshold, suspend_weeks, cancel_hours_before) VALUES (1, 3, 1, 2)')

  const sampleClasses = [
    [1, '晨间瑜伽', 'yoga', 2, '2026-06-15', '07:00', '08:00', 20],
    [2, '搏击基础', 'boxing', 3, '2026-06-15', '09:00', '10:30', 15],
    [3, '动感单车', 'spinning', 2, '2026-06-16', '18:00', '19:00', 25],
    [4, '普拉提核心', 'pilates', 3, '2026-06-16', '10:00', '11:00', 18],
    [5, '力量瑜伽', 'yoga', 2, '2026-06-17', '08:00', '09:30', 20],
    [6, '搏击进阶', 'boxing', 3, '2026-06-17', '19:00', '20:30', 15],
    [7, '单车冲刺', 'spinning', 2, '2026-06-18', '07:30', '08:30', 25],
    [8, '普拉提拉伸', 'pilates', 3, '2026-06-18', '14:00', '15:00', 18],
    [9, '冥想瑜伽', 'yoga', 2, '2026-06-19', '09:00', '10:00', 20],
    [10, '搏击体能', 'boxing', 3, '2026-06-19', '18:00', '19:30', 15],
    [11, '单车耐力', 'spinning', 2, '2026-06-20', '08:00', '09:00', 25],
    [12, '普拉提塑形', 'pilates', 3, '2026-06-20', '15:00', '16:00', 18],
    [13, '流瑜伽', 'yoga', 2, '2026-06-21', '10:00', '11:30', 20],
    [14, '搏击组合', 'boxing', 3, '2026-06-21', '16:00', '17:30', 15],
  ]

  for (const c of sampleClasses) {
    database.run(
      'INSERT OR IGNORE INTO classes (id, name, type, coach_id, date, start_time, end_time, capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      c as any[]
    )
  }

  database.run('INSERT OR IGNORE INTO packages (id, member_id, total_sessions, remaining_sessions, expires_at) VALUES (1, 4, 20, 18, ?)', ['2026-12-31'])
  database.run('INSERT OR IGNORE INTO packages (id, member_id, total_sessions, remaining_sessions, expires_at) VALUES (2, 5, 10, 8, ?)', ['2026-09-30'])
}

saveDb()

export default db
