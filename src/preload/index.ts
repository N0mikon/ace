import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Terminal API for renderer
const terminalAPI = {
  // Spawn a new terminal
  spawn: (options?: { cols?: number; rows?: number; cwd?: string }) => {
    return ipcRenderer.invoke('terminal:spawn', options)
  },

  // Write data to the terminal
  write: (data: string) => {
    return ipcRenderer.invoke('terminal:write', data)
  },

  // Resize the terminal
  resize: (cols: number, rows: number) => {
    return ipcRenderer.invoke('terminal:resize', cols, rows)
  },

  // Kill the terminal
  kill: () => {
    return ipcRenderer.invoke('terminal:kill')
  },

  // Check if terminal is running
  isRunning: () => {
    return ipcRenderer.invoke('terminal:isRunning')
  },

  // Listen for terminal data
  onData: (callback: (data: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },

  // Listen for terminal exit
  onExit: (callback: (info: { exitCode: number; signal?: number }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { exitCode: number; signal?: number }
    ) => callback(info)
    ipcRenderer.on('terminal:exit', handler)
    return () => ipcRenderer.removeListener('terminal:exit', handler)
  }
}

// Config API for renderer
const configAPI = {
  // Get full config
  get: () => {
    return ipcRenderer.invoke('config:get')
  },

  // Get specific config value by path
  getValue: (path: string) => {
    return ipcRenderer.invoke('config:getValue', path)
  },

  // Set specific config value by path
  set: (path: string, value: unknown) => {
    return ipcRenderer.invoke('config:set', path, value)
  },

  // Update multiple config values
  update: (updates: Record<string, unknown>) => {
    return ipcRenderer.invoke('config:update', updates)
  },

  // Check if first run
  isFirstRun: () => {
    return ipcRenderer.invoke('config:isFirstRun')
  },

  // Get config paths
  getPaths: () => {
    return ipcRenderer.invoke('config:getPaths')
  },

  // Reload config from disk
  reload: () => {
    return ipcRenderer.invoke('config:reload')
  }
}

// Session API for renderer
const sessionAPI = {
  // List sessions
  list: (limit?: number, offset?: number) => {
    return ipcRenderer.invoke('session:list', limit, offset)
  },

  // Get session by ID
  get: (sessionId: number) => {
    return ipcRenderer.invoke('session:get', sessionId)
  },

  // Search sessions
  search: (query: string, limit?: number) => {
    return ipcRenderer.invoke('session:search', query, limit)
  },

  // Delete session
  delete: (sessionId: number) => {
    return ipcRenderer.invoke('session:delete', sessionId)
  },

  // Export session to markdown
  export: (sessionId: number) => {
    return ipcRenderer.invoke('session:export', sessionId)
  },

  // Get current session ID
  current: () => {
    return ipcRenderer.invoke('session:current')
  },

  // Get session count
  count: () => {
    return ipcRenderer.invoke('session:count')
  }
}

// Agent API for renderer
const agentAPI = {
  // List all agents
  list: () => {
    return ipcRenderer.invoke('agents:list')
  },

  // Get specific agent by ID
  get: (id: string) => {
    return ipcRenderer.invoke('agents:get', id)
  },

  // Get agent prompt text
  getPrompt: (id: string) => {
    return ipcRenderer.invoke('agents:getPrompt', id)
  },

  // Open agent file in editor
  openFile: (id: string) => {
    return ipcRenderer.invoke('agents:openFile', id)
  },

  // Create new agent
  create: (name: string, description: string, promptText: string) => {
    return ipcRenderer.invoke('agents:create', name, description, promptText)
  },

  // Reload agents from disk
  reload: () => {
    return ipcRenderer.invoke('agents:reload')
  },

  // Listen for agent changes
  onChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('agents:changed', handler)
    return () => ipcRenderer.removeListener('agents:changed', handler)
  }
}

// Hotkey API for renderer
const hotkeyAPI = {
  // List all current bindings
  list: () => {
    return ipcRenderer.invoke('hotkeys:list')
  },

  // Get default hotkeys
  getDefaults: () => {
    return ipcRenderer.invoke('hotkeys:getDefaults')
  },

  // Get hotkey descriptions
  getDescriptions: () => {
    return ipcRenderer.invoke('hotkeys:getDescriptions')
  },

  // Get custom bindings (overrides)
  getCustom: () => {
    return ipcRenderer.invoke('hotkeys:getCustom')
  },

  // Update a hotkey binding
  update: (id: string, accelerator: string) => {
    return ipcRenderer.invoke('hotkeys:update', id, accelerator)
  },

  // Reset a hotkey to default
  reset: (id: string) => {
    return ipcRenderer.invoke('hotkeys:reset', id)
  },

  // Reset all hotkeys to defaults
  resetAll: () => {
    return ipcRenderer.invoke('hotkeys:resetAll')
  },

  // Enable/disable hotkeys
  setEnabled: (enabled: boolean) => {
    return ipcRenderer.invoke('hotkeys:setEnabled', enabled)
  },

  // Validate an accelerator
  validate: (accelerator: string) => {
    return ipcRenderer.invoke('hotkeys:validate', accelerator)
  },

  // Listen for hotkey triggers
  onTriggered: (callback: (data: { id: string; action: unknown }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; action: unknown }) =>
      callback(data)
    ipcRenderer.on('hotkey:triggered', handler)
    return () => ipcRenderer.removeListener('hotkey:triggered', handler)
  }
}

// Project API for renderer
const projectAPI = {
  // Get recent projects
  getRecent: () => {
    return ipcRenderer.invoke('projects:getRecent')
  },

  // Get current project
  getCurrent: () => {
    return ipcRenderer.invoke('projects:getCurrent')
  },

  // Add project to recent
  addRecent: (projectPath: string) => {
    return ipcRenderer.invoke('projects:addRecent', projectPath)
  },

  // Remove project from recent
  removeRecent: (projectPath: string) => {
    return ipcRenderer.invoke('projects:removeRecent', projectPath)
  },

  // Clear recent projects
  clearRecent: () => {
    return ipcRenderer.invoke('projects:clearRecent')
  },

  // Open project
  open: (projectPath: string) => {
    return ipcRenderer.invoke('projects:open', projectPath)
  },

  // Check if project has config
  hasConfig: (projectPath: string) => {
    return ipcRenderer.invoke('projects:hasConfig', projectPath)
  },

  // Load project config (.aceproj)
  loadConfig: (projectPath: string) => {
    return ipcRenderer.invoke('projects:loadConfig', projectPath)
  },

  // Save project config (.aceproj)
  saveConfig: (projectPath: string, config: unknown) => {
    return ipcRenderer.invoke('projects:saveConfig', projectPath, config)
  },

  // Initialize ACE in a project
  initializeAce: (projectPath: string) => {
    return ipcRenderer.invoke('projects:initializeAce', projectPath)
  },

  // Open folder dialog
  openDialog: () => {
    return ipcRenderer.invoke('projects:openDialog')
  },

  // Launch project with options
  launch: (projectPath: string, options: unknown) => {
    return ipcRenderer.invoke('projects:launch', projectPath, options)
  },

  // Listen for project launched event
  onLaunched: (
    callback: (data: { path: string; options: unknown; agentsDir: string | null }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { path: string; options: unknown; agentsDir: string | null }
    ) => callback(data)
    ipcRenderer.on('project:launched', handler)
    return () => ipcRenderer.removeListener('project:launched', handler)
  }
}

// Adapter API for renderer
const adapterAPI = {
  // List all adapters
  list: () => {
    return ipcRenderer.invoke('adapters:list')
  },

  // Get specific adapter by ID
  get: (id: string) => {
    return ipcRenderer.invoke('adapters:get', id)
  },

  // Get active adapter
  getActive: () => {
    return ipcRenderer.invoke('adapters:getActive')
  },

  // Get active adapter ID
  getActiveId: () => {
    return ipcRenderer.invoke('adapters:getActiveId')
  },

  // Set active adapter
  setActive: (id: string) => {
    return ipcRenderer.invoke('adapters:setActive', id)
  },

  // Get command string for active adapter
  getCommand: (commandName: string) => {
    return ipcRenderer.invoke('adapters:getCommand', commandName)
  },

  // Get flag string for active adapter
  getFlag: (flagName: string) => {
    return ipcRenderer.invoke('adapters:getFlag', flagName)
  },

  // Get launch command
  getLaunchCommand: () => {
    return ipcRenderer.invoke('adapters:getLaunchCommand')
  },

  // Get launch command with flags
  getLaunchCommandWithFlags: (flags: string[]) => {
    return ipcRenderer.invoke('adapters:getLaunchCommandWithFlags', flags)
  },

  // Reload adapters from disk
  reload: () => {
    return ipcRenderer.invoke('adapters:reload')
  }
}

// MCP API for renderer
const mcpAPI = {
  // Get all MCP servers
  getServers: () => {
    return ipcRenderer.invoke('mcp:getServers')
  },

  // Get a specific server
  getServer: (name: string) => {
    return ipcRenderer.invoke('mcp:getServer', name)
  },

  // Get config path
  getConfigPath: () => {
    return ipcRenderer.invoke('mcp:getConfigPath')
  },

  // Check if config is loaded
  isLoaded: () => {
    return ipcRenderer.invoke('mcp:isLoaded')
  },

  // Set config path
  setConfigPath: (path: string) => {
    return ipcRenderer.invoke('mcp:setConfigPath', path)
  },

  // Reload config
  reload: () => {
    return ipcRenderer.invoke('mcp:reload')
  },

  // Listen for config changes
  onChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('mcp:changed', handler)
    return () => ipcRenderer.removeListener('mcp:changed', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('terminal', terminalAPI)
    contextBridge.exposeInMainWorld('config', configAPI)
    contextBridge.exposeInMainWorld('session', sessionAPI)
    contextBridge.exposeInMainWorld('agents', agentAPI)
    contextBridge.exposeInMainWorld('hotkeys', hotkeyAPI)
    contextBridge.exposeInMainWorld('mcp', mcpAPI)
    contextBridge.exposeInMainWorld('adapters', adapterAPI)
    contextBridge.exposeInMainWorld('projects', projectAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.terminal = terminalAPI
  // @ts-ignore (define in dts)
  window.config = configAPI
  // @ts-ignore (define in dts)
  window.session = sessionAPI
  // @ts-ignore (define in dts)
  window.agents = agentAPI
  // @ts-ignore (define in dts)
  window.hotkeys = hotkeyAPI
  // @ts-ignore (define in dts)
  window.mcp = mcpAPI
  // @ts-ignore (define in dts)
  window.adapters = adapterAPI
  // @ts-ignore (define in dts)
  window.projects = projectAPI
}
