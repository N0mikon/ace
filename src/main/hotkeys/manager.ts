/**
 * Hotkey Manager for ACE
 * Handles global keyboard shortcuts using Electron's globalShortcut API
 */

import { globalShortcut, BrowserWindow } from 'electron'

export interface HotkeyBinding {
  id: string
  accelerator: string
  description: string
  action: HotkeyAction
}

export type HotkeyAction =
  | { type: 'command'; command: string }
  | { type: 'agent'; agentId: string }
  | { type: 'app'; action: AppAction }

export type AppAction =
  | 'toggleSidebar'
  | 'focusTerminal'
  | 'openSettings'
  | 'newSession'
  | 'exportSession'

// Default hotkey bindings
export const DEFAULT_HOTKEYS: Record<string, string> = {
  // Quick commands
  exit: 'CommandOrControl+Shift+E',
  compact: 'CommandOrControl+Shift+C',
  clear: 'CommandOrControl+Shift+K',
  help: 'CommandOrControl+Shift+H',

  // App actions
  toggleSidebar: 'CommandOrControl+B',
  focusTerminal: 'CommandOrControl+`',
  openSettings: 'CommandOrControl+,',
  newSession: 'CommandOrControl+Shift+N',
  exportSession: 'CommandOrControl+Shift+S',

  // Agent hotkeys (Ctrl+1-9 reserved)
  agent1: 'CommandOrControl+1',
  agent2: 'CommandOrControl+2',
  agent3: 'CommandOrControl+3',
  agent4: 'CommandOrControl+4',
  agent5: 'CommandOrControl+5',
  agent6: 'CommandOrControl+6',
  agent7: 'CommandOrControl+7',
  agent8: 'CommandOrControl+8',
  agent9: 'CommandOrControl+9'
}

// Command descriptions for UI
export const HOTKEY_DESCRIPTIONS: Record<string, string> = {
  exit: 'Send /exit to terminal',
  compact: 'Send /compact to terminal',
  clear: 'Send /clear to terminal',
  help: 'Send /help to terminal',
  toggleSidebar: 'Toggle sidebar visibility',
  focusTerminal: 'Focus terminal',
  openSettings: 'Open settings',
  newSession: 'Start new terminal session',
  exportSession: 'Export current session',
  agent1: 'Activate Agent 1',
  agent2: 'Activate Agent 2',
  agent3: 'Activate Agent 3',
  agent4: 'Activate Agent 4',
  agent5: 'Activate Agent 5',
  agent6: 'Activate Agent 6',
  agent7: 'Activate Agent 7',
  agent8: 'Activate Agent 8',
  agent9: 'Activate Agent 9'
}

// Map hotkey IDs to their actions
const HOTKEY_ACTIONS: Record<string, HotkeyAction> = {
  exit: { type: 'command', command: '/exit\n' },
  compact: { type: 'command', command: '/compact\n' },
  clear: { type: 'command', command: '/clear\n' },
  help: { type: 'command', command: '/help\n' },
  toggleSidebar: { type: 'app', action: 'toggleSidebar' },
  focusTerminal: { type: 'app', action: 'focusTerminal' },
  openSettings: { type: 'app', action: 'openSettings' },
  newSession: { type: 'app', action: 'newSession' },
  exportSession: { type: 'app', action: 'exportSession' },
  agent1: { type: 'agent', agentId: '1' },
  agent2: { type: 'agent', agentId: '2' },
  agent3: { type: 'agent', agentId: '3' },
  agent4: { type: 'agent', agentId: '4' },
  agent5: { type: 'agent', agentId: '5' },
  agent6: { type: 'agent', agentId: '6' },
  agent7: { type: 'agent', agentId: '7' },
  agent8: { type: 'agent', agentId: '8' },
  agent9: { type: 'agent', agentId: '9' }
}

class HotkeyManager {
  private bindings: Map<string, HotkeyBinding> = new Map()
  private customBindings: Record<string, string> = {}
  private mainWindow: BrowserWindow | null = null
  private enabled: boolean = true
  private initialized: boolean = false

  /**
   * Initialize hotkey manager with main window reference
   */
  init(mainWindow: BrowserWindow, customBindings?: Record<string, string>): void {
    // Prevent double initialization
    if (this.initialized) {
      console.log('HotkeyManager already initialized, skipping')
      return
    }

    this.mainWindow = mainWindow
    this.customBindings = customBindings || {}
    this.initialized = true
    this.registerAll()

    // Note: We don't re-register on focus since hotkeys stay registered globally.
    // If we wanted to unregister on blur and re-register on focus, we'd add those handlers here.
  }

  /**
   * Register all hotkeys
   */
  registerAll(): void {
    this.unregisterAll()

    for (const [id, defaultAccelerator] of Object.entries(DEFAULT_HOTKEYS)) {
      const accelerator = this.customBindings[id] || defaultAccelerator
      const action = HOTKEY_ACTIONS[id]

      if (action) {
        this.register(id, accelerator, action)
      }
    }

    console.log(`Registered ${this.bindings.size} hotkeys`)
  }

  /**
   * Register a single hotkey
   */
  register(id: string, accelerator: string, action: HotkeyAction): boolean {
    try {
      // Unregister if already registered
      if (this.bindings.has(id)) {
        const existing = this.bindings.get(id)
        if (existing) {
          globalShortcut.unregister(existing.accelerator)
        }
      }

      const success = globalShortcut.register(accelerator, () => {
        this.handleHotkey(id, action)
      })

      if (success) {
        this.bindings.set(id, {
          id,
          accelerator,
          description: HOTKEY_DESCRIPTIONS[id] || id,
          action
        })
        return true
      } else {
        console.warn(`Failed to register hotkey: ${id} (${accelerator})`)
        return false
      }
    } catch (err) {
      console.error(`Error registering hotkey ${id}:`, err)
      return false
    }
  }

  /**
   * Unregister a single hotkey
   */
  unregister(id: string): boolean {
    const binding = this.bindings.get(id)
    if (binding) {
      globalShortcut.unregister(binding.accelerator)
      this.bindings.delete(id)
      return true
    }
    return false
  }

  /**
   * Unregister all hotkeys
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll()
    this.bindings.clear()
  }

  /**
   * Update a hotkey binding
   */
  updateBinding(id: string, accelerator: string): boolean {
    const action = HOTKEY_ACTIONS[id]
    if (!action) {
      console.warn(`Unknown hotkey ID: ${id}`)
      return false
    }

    this.customBindings[id] = accelerator
    return this.register(id, accelerator, action)
  }

  /**
   * Reset a hotkey to its default
   */
  resetBinding(id: string): boolean {
    delete this.customBindings[id]
    const defaultAccelerator = DEFAULT_HOTKEYS[id]
    const action = HOTKEY_ACTIONS[id]

    if (defaultAccelerator && action) {
      return this.register(id, defaultAccelerator, action)
    }
    return false
  }

  /**
   * Reset all hotkeys to defaults
   */
  resetAll(): void {
    this.customBindings = {}
    this.registerAll()
  }

  /**
   * Get all current bindings
   */
  getBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values())
  }

  /**
   * Get custom bindings (overrides)
   */
  getCustomBindings(): Record<string, string> {
    return { ...this.customBindings }
  }

  /**
   * Check if an accelerator is valid
   */
  isValidAccelerator(accelerator: string): boolean {
    // Basic validation - Electron will throw if invalid
    const validModifiers = ['Command', 'Cmd', 'Control', 'Ctrl', 'CommandOrControl', 'CmdOrCtrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta']
    const validKeys = [
      // Letters
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      // Numbers
      ...'0123456789'.split(''),
      // Function keys
      ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
      // Special keys
      'Space', 'Tab', 'Capslock', 'Numlock', 'Scrolllock', 'Backspace', 'Delete', 'Insert', 'Return', 'Enter', 'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown', 'Escape', 'Esc', 'VolumeUp', 'VolumeDown', 'VolumeMute', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop', 'MediaPlayPause', 'PrintScreen', 'numdec', 'numadd', 'numsub', 'nummult', 'numdiv',
      // Punctuation
      'Plus', 'Minus', '`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/'
    ]

    const parts = accelerator.split('+').map(p => p.trim())
    if (parts.length === 0) return false

    const key = parts[parts.length - 1]
    const modifiers = parts.slice(0, -1)

    // Must have at least one modifier for global shortcuts
    if (modifiers.length === 0) return false

    // Check all modifiers are valid
    for (const mod of modifiers) {
      if (!validModifiers.some(v => v.toLowerCase() === mod.toLowerCase())) {
        return false
      }
    }

    // Check key is valid
    return validKeys.some(v => v.toLowerCase() === key.toLowerCase())
  }

  /**
   * Check if an accelerator conflicts with existing binding
   */
  hasConflict(accelerator: string, excludeId?: string): string | null {
    for (const [id, binding] of this.bindings) {
      if (id !== excludeId && binding.accelerator.toLowerCase() === accelerator.toLowerCase()) {
        return id
      }
    }
    return null
  }

  /**
   * Enable/disable all hotkeys
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) {
      this.registerAll()
    } else {
      this.unregisterAll()
    }
  }

  /**
   * Handle hotkey activation
   */
  private handleHotkey(id: string, action: HotkeyAction): void {
    if (!this.mainWindow) return

    // Bring window to focus
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    this.mainWindow.focus()

    // Send action to renderer
    this.mainWindow.webContents.send('hotkey:triggered', { id, action })
  }

  /**
   * Clean up on app quit
   */
  dispose(): void {
    this.unregisterAll()
    this.mainWindow = null
    this.initialized = false
  }
}

// Export singleton instance
export const hotkeyManager = new HotkeyManager()
