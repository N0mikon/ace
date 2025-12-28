import { useState, useEffect, useCallback } from 'react'
import type { McpServerInfo } from '../../api/types'
import { api } from '../../api'
import { useLayoutStore } from '../../stores/layoutStore'
import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import { RefreshCw, ICON_SIZE } from '../common/icons'
import './McpPanel.css'

interface McpPanelProps {
  isHorizontal?: boolean
}

export function McpPanel({ isHorizontal = false }: McpPanelProps): JSX.Element {
  const [servers, setServers] = useState<McpServerInfo[]>([])
  const [configPath, setConfigPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const panelSettings = useLayoutStore((state) => state.panelSettings)
  const settings = panelSettings['mcp'] || { fontSize: 1.0, preferredSize: 20 }

  const loadServers = useCallback(async () => {
    setIsLoading(true)
    const [serverList, path] = await Promise.all([
      api.mcp.getServers(),
      api.mcp.getConfigPath()
    ])
    setServers(serverList || [])
    setConfigPath(path || '')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadServers()

    // Listen for config changes
    const unsubscribe = api.mcp.onChanged(() => {
      loadServers()
    })

    return () => {
      unsubscribe()
    }
  }, [loadServers])

  const toggleExpand = (serverName: string): void => {
    setExpandedServer(expandedServer === serverName ? null : serverName)
  }

  const panelClass = `mcp-panel ${isHorizontal ? 'horizontal' : 'vertical'}`
  const panelStyle = { '--font-scale': settings.fontSize } as React.CSSProperties

  return (
    <div className={panelClass} style={panelStyle}>
      <div className="panel-header">
        <span className="panel-title">MCP Servers</span>
        <div className="header-actions">
          <PanelSettingsButton panelId="mcp" />
          <button className="header-button" onClick={loadServers} title="Refresh">
            <RefreshCw size={ICON_SIZE.sm} />
          </button>
        </div>
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
                <div className="mcp-info">
                  <div className="mcp-name">{server.name}</div>
                  <div className="mcp-command">{server.command}</div>
                  {expandedServer === server.name && server.args.length > 0 && (
                    <div className="mcp-details">
                      <div className="mcp-args">Args: {server.args.join(' ')}</div>
                    </div>
                  )}
                </div>
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
