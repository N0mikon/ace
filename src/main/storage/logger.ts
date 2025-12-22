import { writeFileSync } from 'fs'
import { join } from 'path'
import { databaseManager } from './database'
import { configManager } from '../config'

class SessionLogger {
  private currentSessionId: number | null = null
  private buffer: string = ''
  private flushInterval: NodeJS.Timeout | null = null

  /**
   * Start a new logging session
   */
  startSession(projectPath: string, shell: string): number {
    // End any existing session
    if (this.currentSessionId !== null) {
      this.endSession()
    }

    this.buffer = ''

    // Create new session in database
    this.currentSessionId = databaseManager.createSession(projectPath, shell)

    // Start periodic buffer flush (every 2 seconds)
    this.flushInterval = setInterval(() => {
      this.flushBuffer()
    }, 2000)

    console.log(`Session started: ${this.currentSessionId}`)
    return this.currentSessionId
  }

  /**
   * Log data from PTY output
   */
  log(data: string): void {
    if (this.currentSessionId === null) return

    // Add timestamp prefix for each line if it starts fresh
    this.buffer += data
  }

  /**
   * Log a command that was injected
   */
  logCommand(command: string, source: 'button' | 'hotkey' | 'typed'): void {
    if (this.currentSessionId === null) return

    const timestamp = new Date().toISOString()
    const prefix = `\n[${timestamp}] [${source}] >>> `
    this.buffer += prefix + command
  }

  /**
   * Flush buffer to database
   */
  private flushBuffer(): void {
    if (this.currentSessionId === null || this.buffer.length === 0) return

    databaseManager.appendToTranscript(this.currentSessionId, this.buffer)
    this.buffer = ''
  }

  /**
   * End the current session
   */
  endSession(): void {
    if (this.currentSessionId === null) return

    // Stop flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    // Flush remaining buffer
    this.flushBuffer()

    // End session in database
    databaseManager.endSession(this.currentSessionId)

    // Auto-export if enabled
    const config = configManager.getConfig()
    if (config.logging.autoExport) {
      this.exportToMarkdown(this.currentSessionId)
    }

    console.log(`Session ended: ${this.currentSessionId}`)
    this.currentSessionId = null
  }

  /**
   * Export session to markdown file
   */
  exportToMarkdown(sessionId: number): string | null {
    const session = databaseManager.getSession(sessionId)
    if (!session) return null

    const config = configManager.getConfig()
    const logsDir = config.logging.directory

    const startDate = new Date(session.startTime)
    const filename = `session_${startDate.toISOString().replace(/[:.]/g, '-')}.md`
    const filepath = join(logsDir, filename)

    const duration = session.duration
      ? this.formatDuration(session.duration)
      : 'In progress'

    const markdown = `# ACE Session Log

**Project:** ${session.projectPath}
**Started:** ${session.startTime}
**Ended:** ${session.endTime || 'In progress'}
**Duration:** ${duration}
**Shell:** ${session.shell}

---

## Session Transcript

\`\`\`
${session.transcript}
\`\`\`
`

    try {
      writeFileSync(filepath, markdown, 'utf-8')
      console.log(`Session exported to: ${filepath}`)
      return filepath
    } catch (error) {
      console.error('Failed to export session:', error)
      return null
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): number | null {
    return this.currentSessionId
  }

  /**
   * Check if logging is active
   */
  isLogging(): boolean {
    return this.currentSessionId !== null
  }
}

// Singleton instance
export const sessionLogger = new SessionLogger()
