/**
 * Hotkey Manager for ACE
 * Handles global keyboard shortcuts using Electron's globalShortcut API
 *
 * This system has NO default hotkeys - all hotkeys are user-defined.
 * Users can assign hotkeys to:
 * - Quick commands (send text to terminal)
 * - Agents (invoke an agent)
 * - App actions (toggle panels, focus terminal, etc.)
 */

import { globalShortcut, BrowserWindow } from 'electron'

export interface HotkeyAction {
  type: 'command' | 'agent' | 'app'
  command?: string
  agentId?: string
  appAction?: AppAction
}

export type AppAction =
  | 'toggleLeftPanel'
  | 'toggleRightPanel'
  | 'toggleTopPanel'
  | 'toggleBottomPanel'
  | 'focusTerminal'
  | 'openSettings'

export interface HotkeyBinding {
  id: string
  accelerator: string
  description: string
  action: HotkeyAction
}

export interface HotkeyEntry {
  accelerator: string
  action: {
    type: 'command' | 'agent' | 'app'
    command?: string
    agentId?: string
    appAction?: string
  }
  description: string
}

// Available app actions that can be bound to hotkeys
export const APP_ACTIONS: { id: AppAction; description: string }[] = [
  { id: 'toggleLeftPanel', description: 'Toggle left panel' },
  { id: 'toggleRightPanel', description: 'Toggle right panel' },
  { id: 'toggleTopPanel', description: 'Toggle top panel' },
  { id: 'toggleBottomPanel', description: 'Toggle bottom panel' },
  { id: 'focusTerminal', description: 'Focus terminal' },
  { id: 'openSettings', description: 'Open settings' }
]

class HotkeyManager {
  private bindings: Map<string, HotkeyBinding> = new Map()
  private mainWindow: BrowserWindow | null = null
  private initialized: boolean = false

  /**
   * Initialize hotkey manager with main window reference
   */
  init(mainWindow: BrowserWindow, savedBindings?: HotkeyEntry[]): void {
    if (this.initialized) {
      console.log('HotkeyManager already initialized, skipping')
      return
    }

    this.mainWindow = mainWindow
    this.initialized = true

    // Register saved bindings
    if (savedBindings && savedBindings.length > 0) {
      this.registerFromEntries(savedBindings)
    }

    console.log(`Registered ${this.bindings.size} hotkeys`)
  }

  /**
   * Register hotkeys from saved entries
   */
  registerFromEntries(entries: HotkeyEntry[]): void {
    this.unregisterAll()

    for (const entry of entries) {
      const id = this.generateId(entry.action)
      const action: HotkeyAction = {
        type: entry.action.type,
        command: entry.action.command,
        agentId: entry.action.agentId,
        appAction: entry.action.appAction as AppAction
      }
      this.register(id, entry.accelerator, entry.description, action)
    }
  }

  /**
   * Generate a unique ID for a hotkey action
   */
  private generateId(action: HotkeyEntry['action']): string {
    switch (action.type) {
      case 'command':
        return `cmd_${action.command?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown'}`
      case 'agent':
        return `agent_${action.agentId || 'unknown'}`
      case 'app':
        return `app_${action.appAction || 'unknown'}`
      default:
        return `unknown_${Date.now()}`
    }
  }

  /**
   * Register a single hotkey
   */
  register(id: string, accelerator: string, description: string, action: HotkeyAction): boolean {
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
        this.bindings.set(id, { id, accelerator, description, action })
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
   * Add a new hotkey binding
   */
  addBinding(accelerator: string, action: HotkeyAction, description: string): { success: boolean; id?: string; error?: string } {
    // Validate accelerator
    if (!this.isValidAccelerator(accelerator)) {
      return { success: false, error: 'Invalid key combination' }
    }

    // Check for conflicts
    const conflict = this.hasConflict(accelerator)
    if (conflict) {
      const existingBinding = this.bindings.get(conflict)
      return { success: false, error: `Conflicts with: ${existingBinding?.description || conflict}` }
    }

    const id = this.generateId({
      type: action.type,
      command: action.command,
      agentId: action.agentId,
      appAction: action.appAction
    })

    const success = this.register(id, accelerator, description, action)
    return { success, id: success ? id : undefined }
  }

  /**
   * Remove a hotkey binding
   */
  removeBinding(id: string): boolean {
    const binding = this.bindings.get(id)
    if (binding) {
      globalShortcut.unregister(binding.accelerator)
      this.bindings.delete(id)
      return true
    }
    return false
  }

  /**
   * Update a hotkey binding's accelerator
   */
  updateBinding(id: string, newAccelerator: string): { success: boolean; error?: string } {
    const binding = this.bindings.get(id)
    if (!binding) {
      return { success: false, error: 'Hotkey not found' }
    }

    // Validate accelerator
    if (!this.isValidAccelerator(newAccelerator)) {
      return { success: false, error: 'Invalid key combination' }
    }

    // Check for conflicts
    const conflict = this.hasConflict(newAccelerator, id)
    if (conflict) {
      const existingBinding = this.bindings.get(conflict)
      return { success: false, error: `Conflicts with: ${existingBinding?.description || conflict}` }
    }

    // Unregister old and register new
    globalShortcut.unregister(binding.accelerator)
    const success = this.register(id, newAccelerator, binding.description, binding.action)

    return { success }
  }

  /**
   * Unregister all hotkeys
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll()
    this.bindings.clear()
  }

  /**
   * Get all current bindings
   */
  getBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values())
  }

  /**
   * Get bindings as entries for saving to config
   */
  getBindingsAsEntries(): HotkeyEntry[] {
    return Array.from(this.bindings.values()).map(b => ({
      accelerator: b.accelerator,
      action: {
        type: b.action.type,
        command: b.action.command,
        agentId: b.action.agentId,
        appAction: b.action.appAction
      },
      description: b.description
    }))
  }

  /**
   * Check if an accelerator is valid
   */
  isValidAccelerator(accelerator: string): boolean {
    const validModifiers = ['Command', 'Cmd', 'Control', 'Ctrl', 'CommandOrControl', 'CmdOrCtrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta']
    const validKeys = [
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      ...'0123456789'.split(''),
      ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
      'Space', 'Tab', 'Capslock', 'Numlock', 'Scrolllock', 'Backspace', 'Delete', 'Insert', 'Return', 'Enter', 'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown', 'Escape', 'Esc', 'VolumeUp', 'VolumeDown', 'VolumeMute', 'MediaNextTrack', 'MediaPreviousTrack', 'MediaStop', 'MediaPlayPause', 'PrintScreen',
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
    if (enabled) {
      // Re-register all bindings
      const entries = this.getBindingsAsEntries()
      this.registerFromEntries(entries)
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
