import { useState, useEffect } from 'react'
import './StatusBar.css'

interface StatusBarProps {
  terminalReady: boolean
  sidebarCollapsed?: boolean
  onOpenSettings?: () => void
}

export function StatusBar({ terminalReady, sidebarCollapsed, onOpenSettings }: StatusBarProps): JSX.Element {
  const [sessionTime, setSessionTime] = useState('00:00:00')
  const [startTime] = useState(Date.now())
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [agentCount, setAgentCount] = useState(0)
  const [mcpCount, setMcpCount] = useState(0)

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
      const result = await window.session?.current()
      setSessionId(result?.sessionId || null)
    }
    loadSessionId()
  }, [terminalReady])

  useEffect(() => {
    // Load agent count
    const loadAgents = async (): Promise<void> => {
      const agents = await window.agents?.list()
      setAgentCount(agents?.length || 0)
    }
    loadAgents()

    const unsubscribe = window.agents?.onChanged(() => {
      loadAgents()
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    // Load MCP server count
    const loadMcp = async (): Promise<void> => {
      const servers = await window.mcp?.getServers()
      setMcpCount(servers?.length || 0)
    }
    loadMcp()

    const unsubscribe = window.mcp?.onChanged(() => {
      loadMcp()
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

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
        {sidebarCollapsed && (
          <span className="status-hint">Ctrl+B to show sidebar</span>
        )}
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
    </div>
  )
}

export default StatusBar
