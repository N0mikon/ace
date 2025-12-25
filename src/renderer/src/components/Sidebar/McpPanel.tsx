import { useState, useEffect, useCallback } from 'react'
import type { McpServerInfo } from '../../../../preload/index.d'
import './McpPanel.css'

export function McpPanel(): JSX.Element {
  const [servers, setServers] = useState<McpServerInfo[]>([])
  const [configPath, setConfigPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)

  const loadServers = useCallback(async () => {
    setIsLoading(true)
    const [serverList, path] = await Promise.all([
      window.mcp?.getServers(),
      window.mcp?.getConfigPath()
    ])
    setServers(serverList || [])
    setConfigPath(path || '')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadServers()

    // Listen for config changes
    const unsubscribe = window.mcp?.onChanged(() => {
      loadServers()
    })

    return () => {
      unsubscribe?.()
    }
  }, [loadServers])

  const toggleExpand = (serverName: string): void => {
    setExpandedServer(expandedServer === serverName ? null : serverName)
  }

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'configured':
        return 'configured'
      case 'error':
        return 'error'
      default:
        return 'unknown'
    }
  }

  return (
    <div className="mcp-panel">
      <div className="panel-header">
        <span className="panel-title">MCP Servers</span>
        <button className="header-button" onClick={loadServers} title="Refresh">
          &#8635;
        </button>
      </div>

      {isLoading ? (
        <div className="mcp-loading">Loading...</div>
      ) : servers.length === 0 ? (
        <div className="mcp-empty">
          <p>No MCP servers in this project.</p>
          <p className="hint">Add MCP servers when creating a new project.</p>
        </div>
      ) : (
        <>
          <div className="mcp-list">
            {servers.map((server) => (
              <div
                key={server.name}
                className="mcp-item"
                onClick={() => toggleExpand(server.name)}
              >
                <span className={`mcp-status ${getStatusClass(server.status)}`} />
                <div className="mcp-info">
                  <div className="mcp-name">{server.name}</div>
                  <div className="mcp-command">{server.command}</div>
                  {expandedServer === server.name && server.args.length > 0 && (
                    <div className="mcp-details">
                      <div className="mcp-args">Args: {server.args.join(' ')}</div>
                    </div>
                  )}
                </div>
                {server.toolCount !== undefined && (
                  <span className="mcp-tool-count">{server.toolCount} tools</span>
                )}
              </div>
            ))}
          </div>
          {configPath && <div className="mcp-config-path">{configPath}</div>}
        </>
      )}
    </div>
  )
}

export default McpPanel
