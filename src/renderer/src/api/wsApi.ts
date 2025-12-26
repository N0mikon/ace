/**
 * WebSocket API Implementation
 * Used when running in browser mode (not Electron).
 * Connects to ACE server via WebSocket for all API calls.
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
  LayoutAPI,
  TerminalExitInfo,
  HotkeyTriggerData,
  LayoutChangedData
} from './types'

// WebSocket message types
interface WSRequest {
  id: string
  type: 'rpc'
  channel: string
  args?: unknown[]
}

interface WSResponse {
  id: string
  type: 'response'
  success: boolean
  data?: unknown
  error?: string
}

interface WSEvent {
  type: 'event'
  channel: string
  data: unknown
}

export interface WSSyncState {
  terminalRunning: boolean
  terminalBuffer: string
  config: unknown
  serverPort: number
  currentProject: { path: string; name: string } | null
}

interface WSSync {
  type: 'sync'
  state: WSSyncState
}

type WSMessage = WSResponse | WSEvent | WSSync

/**
 * WebSocket connection manager
 */
class WebSocketConnection {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
  private eventHandlers = new Map<string, Set<(data: unknown) => void>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private url: string = ''
  private syncState: WSSyncState | null = null
  private syncResolver: (() => void) | null = null

  /**
   * Connect to the WebSocket server
   * Resolves after receiving the initial sync message from the server
   */
  connect(url: string): Promise<void> {
    this.url = url

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        // Store resolver to be called when sync message arrives
        this.syncResolver = resolve

        this.ws.onopen = () => {
          console.log('WebSocket connected to', url)
          this.reconnectAttempts = 0
          // Don't resolve yet - wait for sync message
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.syncResolver = null
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.handleDisconnect()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        // Timeout if sync doesn't arrive within 10 seconds
        setTimeout(() => {
          if (this.syncResolver) {
            console.warn('Sync timeout - resolving without sync state')
            this.syncResolver()
            this.syncResolver = null
          }
        }, 10000)
      } catch (error) {
        this.syncResolver = null
        reject(error)
      }
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(raw: string): void {
    try {
      const msg: WSMessage = JSON.parse(raw)

      if (msg.type === 'response') {
        // RPC response - resolve pending request
        const pending = this.pendingRequests.get(msg.id)
        if (pending) {
          if (msg.success) {
            pending.resolve(msg.data)
          } else {
            pending.reject(new Error(msg.error || 'Request failed'))
          }
          this.pendingRequests.delete(msg.id)
        }
      } else if (msg.type === 'event') {
        // Event push - notify handlers
        const handlers = this.eventHandlers.get(msg.channel)
        handlers?.forEach(handler => handler(msg.data))
      } else if (msg.type === 'sync') {
        // Initial state sync
        this.syncState = msg.state
        console.log('Received initial state sync:', msg.state)

        // If terminal has buffer content, emit it
        if (msg.state.terminalBuffer) {
          const handlers = this.eventHandlers.get('terminal:data')
          handlers?.forEach(handler => handler(msg.state.terminalBuffer))
        }

        // Resolve the connection promise now that we have sync state
        if (this.syncResolver) {
          this.syncResolver()
          this.syncResolver = null
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle disconnection - attempt reconnect
   */
  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect(this.url).catch(err => {
          console.error('Reconnection failed:', err)
        })
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error('Connection lost'))
      })
      this.pendingRequests.clear()
    }
  }

  /**
   * Send RPC request and wait for response
   */
  async invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const id = String(++this.requestId)

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject
      })

      const request: WSRequest = {
        id,
        type: 'rpc',
        channel,
        args
      }

      this.ws!.send(JSON.stringify(request))

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${channel}`))
        }
      }, 30000)
    })
  }

  /**
   * Subscribe to events
   */
  on(channel: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(channel)) {
      this.eventHandlers.set(channel, new Set())
    }
    this.eventHandlers.get(channel)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(channel)?.delete(handler)
    }
  }

  /**
   * Get initial sync state
   */
  getSyncState(): WSSyncState | null {
    return this.syncState
  }

  /**
   * Get current project from sync state
   */
  getCurrentProject(): { path: string; name: string } | null {
    return this.syncState?.currentProject || null
  }

  /**
   * Close connection
   */
  close(): void {
    this.ws?.close()
    this.ws = null
  }
}

// Singleton connection instance
const connection = new WebSocketConnection()

/**
 * Get the current project from sync state (browser mode only)
 */
export function getWsSyncedProject(): { path: string; name: string } | null {
  return connection.getCurrentProject()
}

/**
 * Get the full sync state (browser mode only)
 * Includes terminalRunning, currentProject, etc.
 */
export function getWsSyncState(): WSSyncState | null {
  return connection.getSyncState()
}

/**
 * Check if a terminal session is actively running (browser mode only)
 */
export function isTerminalRunning(): boolean {
  return connection.getSyncState()?.terminalRunning ?? false
}

// Initialize connection
let initPromise: Promise<void> | null = null

export async function initializeWsApi(): Promise<void> {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    // Use the same host and port as the HTTP server we were loaded from
    const params = new URLSearchParams(window.location.search)
    const host = window.location.hostname || 'localhost'
    // Use URL param port if specified, otherwise use the port we're being served from
    const port = params.get('port') || window.location.port || '3456'

    await connection.connect(`ws://${host}:${port}`)
  })()

  return initPromise
}

// Terminal API via WebSocket
const terminalApi: TerminalAPI = {
  spawn: (options) => connection.invoke('terminal:spawn', options),
  write: (data) => connection.invoke('terminal:write', data),
  resize: (cols, rows) => connection.invoke('terminal:resize', cols, rows),
  kill: () => connection.invoke('terminal:kill'),
  isRunning: () => connection.invoke('terminal:isRunning'),
  onData: (callback) => connection.on('terminal:data', callback as (data: unknown) => void),
  onExit: (callback) => connection.on('terminal:exit', (data) => callback(data as TerminalExitInfo))
}

// Config API via WebSocket
const configApi: ConfigAPI = {
  get: () => connection.invoke('config:get'),
  getValue: (path) => connection.invoke('config:getValue', path),
  set: (path, value) => connection.invoke('config:set', path, value),
  update: (updates) => connection.invoke('config:update', updates),
  isFirstRun: () => connection.invoke('config:isFirstRun'),
  getPaths: () => connection.invoke('config:getPaths'),
  reload: () => connection.invoke('config:reload')
}

// Session API via WebSocket
const sessionApi: SessionAPI = {
  list: (limit, offset) => connection.invoke('session:list', limit, offset),
  get: (sessionId) => connection.invoke('session:get', sessionId),
  search: (query, limit) => connection.invoke('session:search', query, limit),
  delete: (sessionId) => connection.invoke('session:delete', sessionId),
  export: (sessionId) => connection.invoke('session:export', sessionId),
  current: () => connection.invoke('session:current'),
  count: () => connection.invoke('session:count')
}

// Log API via WebSocket
const logApi: LogAPI = {
  save: (description) => connection.invoke('log:save', description)
}

// Agent API via WebSocket
const agentApi: AgentAPI = {
  list: () => connection.invoke('agents:list'),
  listGlobal: () => connection.invoke('agents:listGlobal'),
  listDefaults: () => connection.invoke('agents:listDefaults'),
  listAllAvailable: () => connection.invoke('agents:listAllAvailable'),
  get: (id) => connection.invoke('agents:get', id),
  getPrompt: (id) => connection.invoke('agents:getPrompt', id),
  openFile: (id) => connection.invoke('agents:openFile', id),
  readFile: (id) => connection.invoke('agents:readFile', id),
  saveFile: (id, content) => connection.invoke('agents:saveFile', id, content),
  create: (name, description, promptText) => connection.invoke('agents:create', name, description, promptText),
  reload: () => connection.invoke('agents:reload'),
  copyToProject: (agentId, projectPath) => connection.invoke('agents:copyToProject', agentId, projectPath),
  getGlobalDirectory: () => connection.invoke('agents:getGlobalDirectory'),
  onChanged: (callback) => connection.on('agents:changed', callback)
}

// Hotkey API via WebSocket
const hotkeyApi: HotkeyAPI = {
  list: () => connection.invoke('hotkeys:list'),
  getAppActions: () => connection.invoke('hotkeys:getAppActions'),
  getEntries: () => connection.invoke('hotkeys:getEntries'),
  add: (accelerator, action, description) => connection.invoke('hotkeys:add', accelerator, action, description),
  remove: (id) => connection.invoke('hotkeys:remove', id),
  update: (id, accelerator) => connection.invoke('hotkeys:update', id, accelerator),
  clearAll: () => connection.invoke('hotkeys:clearAll'),
  loadEntries: (entries) => connection.invoke('hotkeys:loadEntries', entries),
  setEnabled: (enabled) => connection.invoke('hotkeys:setEnabled', enabled),
  validate: (accelerator) => connection.invoke('hotkeys:validate', accelerator),
  onTriggered: (callback) => connection.on('hotkey:triggered', (data) => callback(data as HotkeyTriggerData))
}

// MCP API via WebSocket
const mcpApi: McpAPI = {
  getServers: () => connection.invoke('mcp:getServers'),
  getGlobalServers: () => connection.invoke('mcp:getGlobalServers'),
  getServer: (name) => connection.invoke('mcp:getServer', name),
  getConfigPath: () => connection.invoke('mcp:getConfigPath'),
  isLoaded: () => connection.invoke('mcp:isLoaded'),
  setConfigPath: (path) => connection.invoke('mcp:setConfigPath', path),
  setProjectPath: (projectPath) => connection.invoke('mcp:setProjectPath', projectPath),
  copyToProject: (serverName, projectPath) => connection.invoke('mcp:copyToProject', serverName, projectPath),
  reload: () => connection.invoke('mcp:reload'),
  reloadProject: () => connection.invoke('mcp:reloadProject'),
  onChanged: (callback) => connection.on('mcp:changed', callback)
}

// Adapter API via WebSocket
const adapterApi: AdapterAPI = {
  list: () => connection.invoke('adapters:list'),
  get: (id) => connection.invoke('adapters:get', id),
  getActive: () => connection.invoke('adapters:getActive'),
  getActiveId: () => connection.invoke('adapters:getActiveId'),
  setActive: (id) => connection.invoke('adapters:setActive', id),
  getCommand: (commandName) => connection.invoke('adapters:getCommand', commandName),
  getFlag: (flagName) => connection.invoke('adapters:getFlag', flagName),
  getLaunchCommand: () => connection.invoke('adapters:getLaunchCommand'),
  getLaunchCommandWithFlags: (flags) => connection.invoke('adapters:getLaunchCommandWithFlags', flags),
  reload: () => connection.invoke('adapters:reload')
}

// Project API via WebSocket
const projectApi: ProjectAPI = {
  getRecent: () => connection.invoke('projects:getRecent'),
  getCurrent: () => connection.invoke('projects:getCurrent'),
  addRecent: (projectPath) => connection.invoke('projects:addRecent', projectPath),
  removeRecent: (projectPath) => connection.invoke('projects:removeRecent', projectPath),
  clearRecent: () => connection.invoke('projects:clearRecent'),
  open: (projectPath) => connection.invoke('projects:open', projectPath),
  hasConfig: (projectPath) => connection.invoke('projects:hasConfig', projectPath),
  loadConfig: (projectPath) => connection.invoke('projects:loadConfig', projectPath),
  saveConfig: (projectPath, config) => connection.invoke('projects:saveConfig', projectPath, config),
  initializeAce: (projectPath) => connection.invoke('projects:initializeAce', projectPath),
  openDialog: () => {
    // File dialog not available in browser - return null
    console.warn('File dialog not available in browser mode')
    return Promise.resolve(null)
  },
  launch: (projectPath, options) => connection.invoke('projects:launch', projectPath, options),
  onLaunched: (callback) => connection.on('project:launched', (data) => callback(data as never))
}

// Server API via WebSocket (limited in browser mode)
const serverApi: ServerAPI = {
  start: () => connection.invoke('server:start'),
  stop: () => connection.invoke('server:stop'),
  isRunning: () => connection.invoke('server:isRunning'),
  getPort: () => connection.invoke('server:getPort'),
  getClientCount: () => connection.invoke('server:getClientCount'),
  onStateChanged: (callback) => connection.on('server:state-changed', (data) => callback(data as never))
}

// Layout API via WebSocket (per-project layout storage)
const layoutApi: LayoutAPI = {
  load: (projectPath) => connection.invoke('layout:load', projectPath),
  save: (projectPath, layout) => connection.invoke('layout:save', projectPath, layout),
  onChanged: (callback) => connection.on('layout:changed', (data) => callback(data as LayoutChangedData))
}

// Combined WebSocket API
export const wsApi: ACEAPI = {
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

export default wsApi
