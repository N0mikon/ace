import * as pty from 'node-pty'
import { IPty } from 'node-pty'
import { EventEmitter } from 'events'
import { getShellConfig, ShellConfig } from './shell'

export interface PtyOptions {
  cols?: number
  rows?: number
  cwd?: string
  shell?: Partial<ShellConfig>
}

export class PtyManager extends EventEmitter {
  private ptyProcess: IPty | null = null
  private cols: number = 80
  private rows: number = 30

  /**
   * Spawns a new PTY process. If already running, returns true without respawning.
   */
  spawn(options: PtyOptions = {}): boolean {
    // If PTY is already running, just return success (idempotent)
    if (this.ptyProcess) {
      console.log('PTY already running, reusing existing process')
      return true
    }

    const shellConfig = getShellConfig(options.shell)
    this.cols = options.cols ?? 80
    this.rows = options.rows ?? 30

    try {
      this.ptyProcess = pty.spawn(shellConfig.path, shellConfig.args, {
        name: 'xterm-256color',
        cols: this.cols,
        rows: this.rows,
        cwd: options.cwd ?? process.env.HOME ?? process.env.USERPROFILE,
        env: process.env as Record<string, string>
      })

      // Forward data events
      this.ptyProcess.onData((data: string) => {
        this.emit('data', data)
      })

      // Handle exit
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        this.emit('exit', { exitCode, signal })
        this.ptyProcess = null
      })

      console.log(`PTY spawned: ${shellConfig.path} (${this.cols}x${this.rows})`)
      return true
    } catch (error) {
      console.error('Failed to spawn PTY:', error)
      this.emit('error', error)
      return false
    }
  }

  /**
   * Writes data to the PTY stdin
   */
  write(data: string): void {
    if (!this.ptyProcess) {
      console.warn('Cannot write: PTY not running')
      return
    }
    this.ptyProcess.write(data)
  }

  /**
   * Resizes the PTY
   */
  resize(cols: number, rows: number): void {
    if (!this.ptyProcess) {
      console.warn('Cannot resize: PTY not running')
      return
    }

    if (cols > 0 && rows > 0) {
      this.cols = cols
      this.rows = rows
      this.ptyProcess.resize(cols, rows)
    }
  }

  /**
   * Kills the PTY process
   */
  kill(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill()
      this.ptyProcess = null
    }
  }

  /**
   * Returns whether the PTY is running
   */
  isRunning(): boolean {
    return this.ptyProcess !== null
  }

  /**
   * Gets the current PTY dimensions
   */
  getDimensions(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows }
  }
}

// Singleton instance for the main terminal
export const mainPty = new PtyManager()
