import { useState, useEffect } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { InputDialog } from '../common/InputDialog'
import { api, isElectronMode } from '../../api'
import './StatusBar.css'

interface StatusBarProps {
  terminalReady: boolean
  sidebarCollapsed?: boolean
  onOpenSettings?: () => void
}

interface ServerState {
  running: boolean
  port: number
  clients: number
}

export function StatusBar({ terminalReady, sidebarCollapsed, onOpenSettings }: StatusBarProps): JSX.Element {
  const [sessionTime, setSessionTime] = useState('00:00:00')
  const [startTime] = useState(Date.now())
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [agentCount, setAgentCount] = useState(0)
  const [mcpCount, setMcpCount] = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [serverState, setServerState] = useState<ServerState>({ running: false, port: 3456, clients: 0 })
  const [serverLoading, setServerLoading] = useState(false)
  const closeProject = useProjectStore((state) => state.closeProject)
  const terminalZoom = useLayoutStore((state) => state.terminalZoom)
  const isElectron = isElectronMode()

  useEffect(() => {
    // Update session timer
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const hours = Math.floor(elapsed / 3600000)
      const minutes = Math.floor((elapsed % 3600000) / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      setSessionTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  useEffect(() => {
    // Load session ID
    const loadSessionId = async (): Promise<void> => {
      const result = await api.session.current()
      setSessionId(result?.sessionId || null)
    }
    loadSessionId()
  }, [terminalReady])

  useEffect(() => {
    // Load agent count
    const loadAgents = async (): Promise<void> => {
      const agents = await api.agents.list()
      setAgentCount(agents?.length || 0)
    }
    loadAgents()

    const unsubscribe = api.agents.onChanged(() => {
      loadAgents()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Load MCP server count
    const loadMcp = async (): Promise<void> => {
      const servers = await api.mcp.getServers()
      setMcpCount(servers?.length || 0)
    }
    loadMcp()

    const unsubscribe = api.mcp.onChanged(() => {
      loadMcp()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Server state management (only in Electron mode)
  useEffect(() => {
    if (!isElectron) return

    const loadServerState = async (): Promise<void> => {
      try {
        const [runningResult, port, clients] = await Promise.all([
          api.server.isRunning(),
          api.server.getPort(),
          api.server.getClientCount()
        ])
        setServerState({
          running: runningResult?.running || false,
          port: runningResult?.port || port || 3456,
          clients: clients || 0
        })
      } catch (err) {
        console.error('Failed to load server state:', err)
      }
    }
    loadServerState()

    const unsubscribe = api.server.onStateChanged((state) => {
      setServerState(state)
    })

    return () => {
      unsubscribe()
    }
  }, [isElectron])

  const handleServerToggle = async (): Promise<void> => {
    if (serverLoading) return
    setServerLoading(true)

    try {
      if (serverState.running) {
        await api.server.stop()
      } else {
        await api.server.start()
      }
    } catch (err) {
      console.error('Failed to toggle server:', err)
    } finally {
      setServerLoading(false)
    }
  }

  const handleSaveLog = async (description: string): Promise<void> => {
    setShowSaveDialog(false)
    setSaveStatus('saving')

    try {
      const result = await api.log.save(description)
      if (result?.success) {
        setSaveStatus('saved')
        console.log('Log saved to:', result.filepath)
        // Reset status after a moment
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        console.error('Failed to save log:', result?.error)
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (err) {
      setSaveStatus('error')
      console.error('Error saving log:', err)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className={`status-indicator ${terminalReady ? 'ready' : 'loading'}`} />
        <span className="status-text">
          {terminalReady ? 'Ready' : 'Starting...'}
        </span>
        {sessionId && (
          <>
            <span className="status-divider">|</span>
            <span className="status-item">
              <span className="status-label">Session</span>
              <span className="status-value">#{sessionId}</span>
            </span>
          </>
        )}
      </div>
      <div className="status-center">
        <span className="status-item">
          <span className="status-icon">&#128337;</span>
          <span className="status-value">{sessionTime}</span>
        </span>
        {agentCount > 0 && (
          <>
            <span className="status-divider">|</span>
            <span className="status-item" title={`${agentCount} agents available`}>
              <span className="status-icon">&#129302;</span>
              <span className="status-value">{agentCount}</span>
            </span>
          </>
        )}
        {mcpCount > 0 && (
          <>
            <span className="status-divider">|</span>
            <span className="status-item" title={`${mcpCount} MCP servers`}>
              <span className="status-icon">&#128268;</span>
              <span className="status-value">{mcpCount}</span>
            </span>
          </>
        )}
      </div>
      <div className="status-right">
        {/* Terminal zoom controls - always visible for mobile/browser */}
        <div className="status-zoom-controls">
          <button
            className="status-zoom-btn"
            onClick={() => useLayoutStore.getState().zoomOut()}
            title="Zoom out (Ctrl+-)"
            aria-label="Zoom out terminal"
          >
            &#8722;
          </button>
          <button
            className="status-zoom-btn status-zoom-level"
            onClick={() => useLayoutStore.getState().resetZoom()}
            title="Reset zoom (Ctrl+0)"
            aria-label="Reset zoom"
          >
            {Math.round(terminalZoom * 100)}%
          </button>
          <button
            className="status-zoom-btn"
            onClick={() => useLayoutStore.getState().zoomIn()}
            title="Zoom in (Ctrl+=)"
            aria-label="Zoom in terminal"
          >
            +
          </button>
        </div>
        {sidebarCollapsed && (
          <span className="status-hint">Ctrl+B to show sidebar</span>
        )}
        {/* Server toggle - only show in Electron mode */}
        {isElectron && (
          <button
            className={`status-action-btn status-server-btn ${serverState.running ? 'server-active' : ''}`}
            onClick={handleServerToggle}
            disabled={serverLoading}
            title={
              serverState.running
                ? `Server running on port ${serverState.port}${serverState.clients > 0 ? ` (${serverState.clients} client${serverState.clients > 1 ? 's' : ''})` : ''} - Click to stop`
                : 'Start server for browser access'
            }
            aria-label={serverState.running ? 'Stop server' : 'Start server'}
          >
            <span className={`server-indicator ${serverState.running ? 'running' : 'stopped'}`} />
            <span className="server-label">
              {serverLoading ? '...' : serverState.running ? `${serverState.port}` : 'Host'}
            </span>
            {serverState.running && serverState.clients > 0 && (
              <span className="server-clients">{serverState.clients}</span>
            )}
          </button>
        )}
        <button
          className={`status-action-btn status-save-btn ${saveStatus !== 'idle' ? 'status-save-' + saveStatus : ''}`}
          onClick={() => setShowSaveDialog(true)}
          title={saveStatus === 'saved' ? 'Log saved!' : saveStatus === 'error' ? 'Save failed' : 'Save Log'}
          aria-label="Save Log"
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '\u2713' : saveStatus === 'error' ? '!' : '\uD83D\uDCBE'}
        </button>
        <button
          className="status-action-btn"
          onClick={closeProject}
          title="Close Project"
          aria-label="Close Project"
        >
          &#10006;
        </button>
        {onOpenSettings && (
          <button
            className="status-settings-btn"
            onClick={onOpenSettings}
            title="Settings (Ctrl+,)"
            aria-label="Open Settings"
          >
            &#9881;
          </button>
        )}
        <span className="status-brand">ACE</span>
        <span className="status-version">v0.1.0</span>
      </div>

      <InputDialog
        isOpen={showSaveDialog}
        title="Save Session Log"
        placeholder="What were you working on?"
        confirmLabel="Save Log"
        onConfirm={handleSaveLog}
        onCancel={() => setShowSaveDialog(false)}
      />
    </div>
  )
}

export default StatusBar
