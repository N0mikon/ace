import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export interface SessionRecord {
  id: number
  startTime: string
  endTime: string | null
  duration: number | null
  projectPath: string
  shell: string
  transcript: string
  metadata: string
}

export interface SessionMeta {
  id: number
  startTime: string
  endTime: string | null
  duration: number | null
  projectPath: string
  shell: string
  lineCount: number
}

class DatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    const dataDir = join(app.getPath('userData'), 'ace', 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    this.dbPath = join(dataDir, 'sessions.db')
  }

  /**
   * Initialize the database
   */
  init(): void {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        project_path TEXT NOT NULL,
        shell TEXT NOT NULL,
        transcript TEXT NOT NULL DEFAULT '',
        metadata TEXT NOT NULL DEFAULT '{}'
      )
    `)

    // Create index on start_time for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC)
    `)

    console.log('Database initialized:', this.dbPath)
  }

  /**
   * Create a new session
   */
  createSession(projectPath: string, shell: string): number {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO sessions (start_time, project_path, shell, transcript, metadata)
      VALUES (?, ?, ?, '', '{}')
    `)

    const result = stmt.run(new Date().toISOString(), projectPath, shell)
    return result.lastInsertRowid as number
  }

  /**
   * Append text to session transcript
   */
  appendToTranscript(sessionId: number, text: string): void {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET transcript = transcript || ?
      WHERE id = ?
    `)

    stmt.run(text, sessionId)
  }

  /**
   * End a session
   */
  endSession(sessionId: number): void {
    if (!this.db) throw new Error('Database not initialized')

    const startTimeStmt = this.db.prepare(`
      SELECT start_time FROM sessions WHERE id = ?
    `)
    const row = startTimeStmt.get(sessionId) as { start_time: string } | undefined

    if (!row) return

    const startTime = new Date(row.start_time)
    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    const stmt = this.db.prepare(`
      UPDATE sessions
      SET end_time = ?, duration = ?
      WHERE id = ?
    `)

    stmt.run(endTime.toISOString(), duration, sessionId)
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: number): SessionRecord | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      SELECT
        id,
        start_time as startTime,
        end_time as endTime,
        duration,
        project_path as projectPath,
        shell,
        transcript,
        metadata
      FROM sessions
      WHERE id = ?
    `)

    return (stmt.get(sessionId) as SessionRecord) || null
  }

  /**
   * List sessions with metadata (without full transcript)
   */
  listSessions(limit = 50, offset = 0): SessionMeta[] {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      SELECT
        id,
        start_time as startTime,
        end_time as endTime,
        duration,
        project_path as projectPath,
        shell,
        (LENGTH(transcript) - LENGTH(REPLACE(transcript, CHAR(10), ''))) + 1 as lineCount
      FROM sessions
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `)

    return stmt.all(limit, offset) as SessionMeta[]
  }

  /**
   * Search sessions by transcript content
   */
  searchSessions(query: string, limit = 20): SessionMeta[] {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      SELECT
        id,
        start_time as startTime,
        end_time as endTime,
        duration,
        project_path as projectPath,
        shell,
        (LENGTH(transcript) - LENGTH(REPLACE(transcript, CHAR(10), ''))) + 1 as lineCount
      FROM sessions
      WHERE transcript LIKE ?
      ORDER BY start_time DESC
      LIMIT ?
    `)

    return stmt.all(`%${query}%`, limit) as SessionMeta[]
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: number): boolean {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `)

    const result = stmt.run(sessionId)
    return result.changes > 0
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sessions
    `)

    const row = stmt.get() as { count: number }
    return row.count
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager()
