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
  // List sessions (legacy)
  list: (limit?: number, offset?: number) => {
    return ipcRenderer.invoke('session:list', limit, offset)
  },

  // Get session by ID (legacy)
  get: (sessionId: number) => {
    return ipcRenderer.invoke('session:get', sessionId)
  },

  // Search sessions (legacy)
  search: (query: string, limit?: number) => {
    return ipcRenderer.invoke('session:search', query, limit)
  },

  // Delete session (legacy)
  delete: (sessionId: number) => {
    return ipcRenderer.invoke('session:delete', sessionId)
  },

  // Export session to markdown (legacy)
  export: (sessionId: number) => {
    return ipcRenderer.invoke('session:export', sessionId)
  },

  // Get current session ID
  current: () => {
    return ipcRenderer.invoke('session:current')
  },

  // Get session count (legacy)
  count: () => {
    return ipcRenderer.invoke('session:count')
  }
}

// Log API for renderer
const logAPI = {
  // Save current terminal buffer to a log file
  save: (description: string) => {
    return ipcRenderer.invoke('log:save', description)
  }
}

// Agent API for renderer
const agentAPI = {
  // List project agents only (for Agent Panel)
  list: () => {
    return ipcRenderer.invoke('agents:list')
  },

  // List global agents (user's custom agents)
  listGlobal: () => {
    return ipcRenderer.invoke('agents:listGlobal')
  },

  // List default agents from resources
  listDefaults: () => {
    return ipcRenderer.invoke('agents:listDefaults')
  },

  // List all available agents for selection (global + defaults)
  listAllAvailable: () => {
    return ipcRenderer.invoke('agents:listAllAvailable')
  },

  // Get specific agent by ID
  get: (id: string) => {
    return ipcRenderer.invoke('agents:get', id)
  },

  // Get agent prompt text
  getPrompt: (id: string) => {
    return ipcRenderer.invoke('agents:getPrompt', id)
  },

  // Open agent file in editor (deprecated)
  openFile: (id: string) => {
    return ipcRenderer.invoke('agents:openFile', id)
  },

  // Read agent file content
  readFile: (id: string) => {
    return ipcRenderer.invoke('agents:readFile', id)
  },

  // Save agent file content
  saveFile: (id: string, content: string) => {
    return ipcRenderer.invoke('agents:saveFile', id, content)
  },

  // Create new agent
  create: (name: string, description: string, promptText: string) => {
    return ipcRenderer.invoke('agents:create', name, description, promptText)
  },

  // Reload agents from disk
  reload: () => {
    return ipcRenderer.invoke('agents:reload')
  },

  // Copy agent to project directory
  copyToProject: (agentId: string, projectPath: string) => {
    return ipcRenderer.invoke('agents:copyToProject', agentId, projectPath)
  },

  // Get global agents directory
  getGlobalDirectory: () => {
    return ipcRenderer.invoke('agents:getGlobalDirectory')
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

  // Get available app actions
  getAppActions: () => {
    return ipcRenderer.invoke('hotkeys:getAppActions')
  },

  // Get bindings as entries (for saving to config)
  getEntries: () => {
    return ipcRenderer.invoke('hotkeys:getEntries')
  },

  // Add a new hotkey binding
  add: (
    accelerator: string,
    action: { type: string; command?: string; agentId?: string; appAction?: string },
    description: string
  ) => {
    return ipcRenderer.invoke('hotkeys:add', accelerator, action, description)
  },

  // Remove a hotkey binding
  remove: (id: string) => {
    return ipcRenderer.invoke('hotkeys:remove', id)
  },

  // Update a hotkey binding's accelerator
  update: (id: string, accelerator: string) => {
    return ipcRenderer.invoke('hotkeys:update', id, accelerator)
  },

  // Clear all hotkeys
  clearAll: () => {
    return ipcRenderer.invoke('hotkeys:clearAll')
  },

  // Load hotkeys from entries
  loadEntries: (
    entries: Array<{
      accelerator: string
      action: { type: string; command?: string; agentId?: string; appAction?: string }
      description: string
    }>
  ) => {
    return ipcRenderer.invoke('hotkeys:loadEntries', entries)
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

// Server API for renderer
const serverAPI = {
  // Start the server
  start: () => {
    return ipcRenderer.invoke('server:start')
  },

  // Stop the server
  stop: () => {
    return ipcRenderer.invoke('server:stop')
  },

  // Check if server is running
  isRunning: () => {
    return ipcRenderer.invoke('server:isRunning')
  },

  // Get server port
  getPort: () => {
    return ipcRenderer.invoke('server:getPort')
  },

  // Get connected client count
  getClientCount: () => {
    return ipcRenderer.invoke('server:getClientCount')
  },

  // Listen for server state changes
  onStateChanged: (callback: (state: { running: boolean; port: number; clients: number }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: { running: boolean; port: number; clients: number }
    ) => callback(state)
    ipcRenderer.on('server:state-changed', handler)
    return () => ipcRenderer.removeListener('server:state-changed', handler)
  }
}

// Layout API for renderer (per-project layout storage)
const layoutAPI = {
  // Load layout from project config
  load: (projectPath: string) => {
    return ipcRenderer.invoke('layout:load', projectPath)
  },

  // Save layout to project config
  save: (projectPath: string, layout: unknown) => {
    return ipcRenderer.invoke('layout:save', projectPath, layout)
  },

  // Listen for layout changes (from other clients)
  onChanged: (callback: (data: { projectPath: string; layout: unknown }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { projectPath: string; layout: unknown }
    ) => callback(data)
    ipcRenderer.on('layout:changed', handler)
    return () => ipcRenderer.removeListener('layout:changed', handler)
  }
}

// Skills API for renderer
const skillsAPI = {
  // Get project skills (for SkillsPanel)
  list: () => {
    return ipcRenderer.invoke('skills:list')
  },

  // Get all global skills (for wizard selection)
  listGlobal: () => {
    return ipcRenderer.invoke('skills:listGlobal')
  },

  // Toggle a skill's enabled state
  toggle: (skillId: string, enabled: boolean) => {
    return ipcRenderer.invoke('skills:toggle', skillId, enabled)
  },

  // Reload skills
  reload: () => {
    return ipcRenderer.invoke('skills:reload')
  },

  // Listen for skill changes
  onChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('skills:changed', handler)
    return () => ipcRenderer.removeListener('skills:changed', handler)
  }
}

// App API for renderer
const appAPI = {
  // Quit the application
  quit: () => {
    return ipcRenderer.invoke('app:quit')
  }
}

// Plugins API for renderer
const pluginsAPI = {
  // Get all installed plugins (for PluginsPanel)
  list: () => {
    return ipcRenderer.invoke('plugins:list')
  },

  // Get all global plugins (for wizard selection)
  listGlobal: () => {
    return ipcRenderer.invoke('plugins:listGlobal')
  },

  // Toggle a plugin's enabled state
  toggle: (pluginId: string, enabled: boolean) => {
    return ipcRenderer.invoke('plugins:toggle', pluginId, enabled)
  },

  // Install a plugin
  install: (pluginId: string, location: 'global' | 'project') => {
    return ipcRenderer.invoke('plugins:install', pluginId, location)
  },

  // Uninstall a plugin
  uninstall: (pluginId: string) => {
    return ipcRenderer.invoke('plugins:uninstall', pluginId)
  },

  // Reload plugins
  reload: () => {
    return ipcRenderer.invoke('plugins:reload')
  },

  // Listen for plugin changes
  onChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('plugins:changed', handler)
    return () => ipcRenderer.removeListener('plugins:changed', handler)
  }
}

// MCP API for renderer
const mcpAPI = {
  // Get project MCP servers (for McpPanel)
  getServers: () => {
    return ipcRenderer.invoke('mcp:getServers')
  },

  // Get all global MCP servers (for wizard selection)
  getGlobalServers: () => {
    return ipcRenderer.invoke('mcp:getGlobalServers')
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

  // Set project path (loads project MCP servers)
  setProjectPath: (projectPath: string | null) => {
    return ipcRenderer.invoke('mcp:setProjectPath', projectPath)
  },

  // Copy a global MCP server to project
  copyToProject: (serverName: string, projectPath: string) => {
    return ipcRenderer.invoke('mcp:copyToProject', serverName, projectPath)
  },

  // Reload global config
  reload: () => {
    return ipcRenderer.invoke('mcp:reload')
  },

  // Reload project servers
  reloadProject: () => {
    return ipcRenderer.invoke('mcp:reloadProject')
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
    contextBridge.exposeInMainWorld('log', logAPI)
    contextBridge.exposeInMainWorld('agents', agentAPI)
    contextBridge.exposeInMainWorld('hotkeys', hotkeyAPI)
    contextBridge.exposeInMainWorld('mcp', mcpAPI)
    contextBridge.exposeInMainWorld('adapters', adapterAPI)
    contextBridge.exposeInMainWorld('projects', projectAPI)
    contextBridge.exposeInMainWorld('server', serverAPI)
    contextBridge.exposeInMainWorld('layout', layoutAPI)
    contextBridge.exposeInMainWorld('skills', skillsAPI)
    contextBridge.exposeInMainWorld('plugins', pluginsAPI)
    contextBridge.exposeInMainWorld('app', appAPI)
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
  window.log = logAPI
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
  // @ts-ignore (define in dts)
  window.server = serverAPI
  // @ts-ignore (define in dts)
  window.layout = layoutAPI
  // @ts-ignore (define in dts)
  window.skills = skillsAPI
  // @ts-ignore (define in dts)
  window.plugins = pluginsAPI
  // @ts-ignore (define in dts)
  window.app = appAPI
}
