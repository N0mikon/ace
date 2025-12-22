/**
 * Window state persistence for ACE
 * Saves and restores window position, size, and maximized state
 */

import * as fs from 'fs'
import * as path from 'path'
import { app, BrowserWindow, screen } from 'electron'

export interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const DEFAULT_STATE: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false
}

class WindowStateManager {
  private statePath: string = ''
  private state: WindowState = { ...DEFAULT_STATE }
  private window: BrowserWindow | null = null
  private saveTimeout: NodeJS.Timeout | null = null
  private initialized: boolean = false

  /**
   * Initialize the window state manager (call after app is ready)
   */
  init(): void {
    if (this.initialized) return
    this.statePath = path.join(app.getPath('appData'), 'ace', 'ace', 'window-state.json')
    this.state = this.load()
    this.initialized = true
  }

  /**
   * Get the current window state (for creating window)
   */
  getState(): WindowState {
    if (!this.initialized) {
      this.init()
    }
    return { ...this.state }
  }

  /**
   * Attach to a window to track its state
   */
  track(window: BrowserWindow): void {
    this.window = window

    // Restore maximized state
    if (this.state.isMaximized) {
      window.maximize()
    }

    // Track window events
    window.on('resize', () => this.saveStateDebounced())
    window.on('move', () => this.saveStateDebounced())
    window.on('close', () => this.saveState())
  }

  /**
   * Validate that position is on a visible display
   */
  private validatePosition(state: WindowState): WindowState {
    const displays = screen.getAllDisplays()

    // Check if the window would be visible on any display
    const isVisible = displays.some((display) => {
      const { x, y, width, height } = display.bounds
      const windowX = state.x ?? 0
      const windowY = state.y ?? 0

      // Window is visible if at least 100px is on screen
      return (
        windowX + 100 > x &&
        windowX < x + width &&
        windowY + 100 > y &&
        windowY < y + height
      )
    })

    if (!isVisible) {
      // Reset position to center on primary display
      const primary = screen.getPrimaryDisplay()
      return {
        ...state,
        x: Math.round((primary.bounds.width - state.width) / 2),
        y: Math.round((primary.bounds.height - state.height) / 2)
      }
    }

    return state
  }

  /**
   * Load window state from disk
   */
  private load(): WindowState {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, 'utf-8')
        const state = JSON.parse(data) as WindowState

        // Validate and return
        return this.validatePosition({
          ...DEFAULT_STATE,
          ...state
        })
      }
    } catch (err) {
      console.error('Failed to load window state:', err)
    }

    return { ...DEFAULT_STATE }
  }

  /**
   * Save window state to disk (debounced)
   */
  private saveStateDebounced(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      this.saveState()
    }, 500)
  }

  /**
   * Save window state to disk
   */
  private saveState(): void {
    if (!this.window) return

    try {
      const isMaximized = this.window.isMaximized()

      // Don't save position/size when maximized
      if (!isMaximized) {
        const bounds = this.window.getBounds()
        this.state = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false
        }
      } else {
        this.state.isMaximized = true
      }

      // Ensure directory exists
      const dir = path.dirname(this.statePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2))
    } catch (err) {
      console.error('Failed to save window state:', err)
    }
  }
}

// Export singleton instance
export const windowStateManager = new WindowStateManager()
