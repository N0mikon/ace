import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

class SessionLogger {
  private buffer: string = ''
  private sessionStartTime: Date | null = null
  private currentProjectPath: string = ''

  /**
   * Set the current project path for log saving
   */
  setProjectPath(projectPath: string): void {
    this.currentProjectPath = projectPath
    console.log(`Session logger project path set to: ${projectPath}`)
  }

  /**
   * Start a new logging session (just resets the buffer)
   */
  startSession(projectPath: string, _shell: string): number {
    this.buffer = ''
    this.sessionStartTime = new Date()
    if (projectPath) {
      this.currentProjectPath = projectPath
    }
    console.log('Session logging started')
    return 0 // No longer using session IDs
  }

  /**
   * Log data from PTY output
   */
  log(data: string): void {
    this.buffer += data
  }

  /**
   * Log a command that was injected
   */
  logCommand(command: string, source: 'button' | 'hotkey' | 'typed'): void {
    const timestamp = new Date().toISOString()
    const prefix = `\n[${timestamp}] [${source}] >>> `
    this.buffer += prefix + command
  }

  /**
   * Save the current buffer to a log file
   */
  saveLog(description: string, projectPath?: string): { success: boolean; filepath?: string; error?: string } {
    const targetPath = projectPath || this.currentProjectPath
    if (!targetPath) {
      return { success: false, error: 'No project path available' }
    }

    if (this.buffer.length === 0) {
      return { success: false, error: 'No content to save' }
    }

    // Create logs directory in .ace folder
    const logsDir = join(targetPath, '.ace', 'logs')
    try {
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true })
      }
    } catch (err) {
      return { success: false, error: `Failed to create logs directory: ${err}` }
    }

    // Generate filename with timestamp
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    const filename = `${timestamp}.md`
    const filepath = join(logsDir, filename)

    // Calculate session duration
    const duration = this.sessionStartTime
      ? this.formatDuration(Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000))
      : 'Unknown'

    // Format markdown content
    const markdown = `# Session Log

**Description:** ${description}
**Date:** ${now.toLocaleString()}
**Project:** ${targetPath}
**Duration:** ${duration}

---

## Terminal Output

\`\`\`
${this.buffer}
\`\`\`
`

    try {
      writeFileSync(filepath, markdown, 'utf-8')
      console.log(`Log saved to: ${filepath}`)

      // Clear buffer after successful save
      this.buffer = ''
      this.sessionStartTime = new Date()

      return { success: true, filepath }
    } catch (error) {
      console.error('Failed to save log:', error)
      return { success: false, error: `Failed to write file: ${error}` }
    }
  }

  /**
   * End the current session (just logs, doesn't save)
   */
  endSession(): void {
    console.log('Session ended')
    // Buffer is preserved in case user wants to save later
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
   * Get current session ID (deprecated, returns 0)
   */
  getCurrentSessionId(): number | null {
    return this.sessionStartTime ? 0 : null
  }

  /**
   * Check if logging is active
   */
  isLogging(): boolean {
    return this.sessionStartTime !== null
  }

  /**
   * Get the current buffer length (for UI status)
   */
  getBufferSize(): number {
    return this.buffer.length
  }
}

// Singleton instance
export const sessionLogger = new SessionLogger()
