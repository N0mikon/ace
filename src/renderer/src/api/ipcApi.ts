/**
 * IPC API Implementation
 * Wraps the Electron preload window.* APIs for use through the abstraction layer.
 * This is used when running in Electron mode.
 */

import type {
  ACEAPI,
  TerminalAPI,
  ConfigAPI,
  SessionAPI,
  LogAPI,
  AgentAPI,
  HotkeyAPI,
  McpAPI,
  AdapterAPI,
  ProjectAPI,
  ServerAPI,
  LayoutAPI
} from './types'

// Terminal API - wraps window.terminal
const terminalApi: TerminalAPI = {
  spawn: (options) => window.terminal.spawn(options),
  write: (data) => window.terminal.write(data),
  resize: (cols, rows) => window.terminal.resize(cols, rows),
  kill: () => window.terminal.kill(),
  isRunning: () => window.terminal.isRunning(),
  onData: (callback) => window.terminal.onData(callback),
  onExit: (callback) => window.terminal.onExit(callback)
}

// Config API - wraps window.config
const configApi: ConfigAPI = {
  get: () => window.config.get(),
  getValue: (path) => window.config.getValue(path),
  set: (path, value) => window.config.set(path, value),
  update: (updates) => window.config.update(updates),
  isFirstRun: () => window.config.isFirstRun(),
  getPaths: () => window.config.getPaths(),
  reload: () => window.config.reload()
}

// Session API - wraps window.session
const sessionApi: SessionAPI = {
  list: (limit, offset) => window.session.list(limit, offset),
  get: (sessionId) => window.session.get(sessionId),
  search: (query, limit) => window.session.search(query, limit),
  delete: (sessionId) => window.session.delete(sessionId),
  export: (sessionId) => window.session.export(sessionId),
  current: () => window.session.current(),
  count: () => window.session.count()
}

// Log API - wraps window.log
const logApi: LogAPI = {
  save: (description) => window.log.save(description)
}

// Agent API - wraps window.agents
const agentApi: AgentAPI = {
  list: () => window.agents.list(),
  listGlobal: () => window.agents.listGlobal(),
  listDefaults: () => window.agents.listDefaults(),
  listAllAvailable: () => window.agents.listAllAvailable(),
  get: (id) => window.agents.get(id),
  getPrompt: (id) => window.agents.getPrompt(id),
  openFile: (id) => window.agents.openFile(id),
  readFile: (id) => window.agents.readFile(id),
  saveFile: (id, content) => window.agents.saveFile(id, content),
  create: (name, description, promptText) => window.agents.create(name, description, promptText),
  reload: () => window.agents.reload(),
  copyToProject: (agentId, projectPath) => window.agents.copyToProject(agentId, projectPath),
  getGlobalDirectory: () => window.agents.getGlobalDirectory(),
  onChanged: (callback) => window.agents.onChanged(callback)
}

// Hotkey API - wraps window.hotkeys
const hotkeyApi: HotkeyAPI = {
  list: () => window.hotkeys.list(),
  getAppActions: () => window.hotkeys.getAppActions(),
  getEntries: () => window.hotkeys.getEntries(),
  add: (accelerator, action, description) => window.hotkeys.add(accelerator, action, description),
  remove: (id) => window.hotkeys.remove(id),
  update: (id, accelerator) => window.hotkeys.update(id, accelerator),
  clearAll: () => window.hotkeys.clearAll(),
  loadEntries: (entries) => window.hotkeys.loadEntries(entries),
  setEnabled: (enabled) => window.hotkeys.setEnabled(enabled),
  validate: (accelerator) => window.hotkeys.validate(accelerator),
  onTriggered: (callback) => window.hotkeys.onTriggered(callback)
}

// MCP API - wraps window.mcp
const mcpApi: McpAPI = {
  getServers: () => window.mcp.getServers(),
  getGlobalServers: () => window.mcp.getGlobalServers(),
  getServer: (name) => window.mcp.getServer(name),
  getConfigPath: () => window.mcp.getConfigPath(),
  isLoaded: () => window.mcp.isLoaded(),
  setConfigPath: (path) => window.mcp.setConfigPath(path),
  setProjectPath: (projectPath) => window.mcp.setProjectPath(projectPath),
  copyToProject: (serverName, projectPath) => window.mcp.copyToProject(serverName, projectPath),
  reload: () => window.mcp.reload(),
  reloadProject: () => window.mcp.reloadProject(),
  onChanged: (callback) => window.mcp.onChanged(callback)
}

// Adapter API - wraps window.adapters
const adapterApi: AdapterAPI = {
  list: () => window.adapters.list(),
  get: (id) => window.adapters.get(id),
  getActive: () => window.adapters.getActive(),
  getActiveId: () => window.adapters.getActiveId(),
  setActive: (id) => window.adapters.setActive(id),
  getCommand: (commandName) => window.adapters.getCommand(commandName),
  getFlag: (flagName) => window.adapters.getFlag(flagName),
  getLaunchCommand: () => window.adapters.getLaunchCommand(),
  getLaunchCommandWithFlags: (flags) => window.adapters.getLaunchCommandWithFlags(flags),
  reload: () => window.adapters.reload()
}

// Project API - wraps window.projects
const projectApi: ProjectAPI = {
  getRecent: () => window.projects.getRecent(),
  getCurrent: () => window.projects.getCurrent(),
  addRecent: (projectPath) => window.projects.addRecent(projectPath),
  removeRecent: (projectPath) => window.projects.removeRecent(projectPath),
  clearRecent: () => window.projects.clearRecent(),
  open: (projectPath) => window.projects.open(projectPath),
  hasConfig: (projectPath) => window.projects.hasConfig(projectPath),
  loadConfig: (projectPath) => window.projects.loadConfig(projectPath),
  saveConfig: (projectPath, config) => window.projects.saveConfig(projectPath, config),
  initializeAce: (projectPath) => window.projects.initializeAce(projectPath),
  openDialog: () => window.projects.openDialog(),
  launch: (projectPath, options) => window.projects.launch(projectPath, options),
  onLaunched: (callback) => window.projects.onLaunched(callback)
}

// Server API - wraps window.server
const serverApi: ServerAPI = {
  start: () => {
    if (window.server) {
      return window.server.start()
    }
    return Promise.resolve({ success: false, error: 'Server API not available' })
  },
  stop: () => {
    if (window.server) {
      return window.server.stop()
    }
    return Promise.resolve({ success: false })
  },
  isRunning: () => {
    if (window.server) {
      return window.server.isRunning()
    }
    return Promise.resolve({ running: false })
  },
  getPort: () => {
    if (window.server) {
      return window.server.getPort()
    }
    return Promise.resolve(3456)
  },
  getClientCount: () => {
    if (window.server) {
      return window.server.getClientCount()
    }
    return Promise.resolve(0)
  },
  onStateChanged: (callback) => {
    if (window.server) {
      return window.server.onStateChanged(callback)
    }
    // Return no-op unsubscribe function
    return () => {}
  }
}

// Layout API - wraps window.layout (per-project layout storage)
const layoutApi: LayoutAPI = {
  load: (projectPath) => {
    if (window.layout) {
      return window.layout.load(projectPath)
    }
    return Promise.resolve(null)
  },
  save: (projectPath, layout) => {
    if (window.layout) {
      return window.layout.save(projectPath, layout)
    }
    return Promise.resolve({ success: false })
  },
  onChanged: (callback) => {
    if (window.layout) {
      return window.layout.onChanged(callback)
    }
    return () => {}
  }
}

// Combined IPC API
export const ipcApi: ACEAPI = {
  terminal: terminalApi,
  config: configApi,
  session: sessionApi,
  log: logApi,
  agents: agentApi,
  hotkeys: hotkeyApi,
  mcp: mcpApi,
  adapters: adapterApi,
  projects: projectApi,
  server: serverApi,
  layout: layoutApi
}

export default ipcApi
