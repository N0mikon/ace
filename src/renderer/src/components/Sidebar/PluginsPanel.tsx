/**
 * Plugins Panel Component
 * Displays installed plugins with management actions
 */

import { useState, useEffect } from 'react'
import { api } from '../../api'
import { Plugin } from '../../api/types'
import { useLayoutStore } from '../../stores/layoutStore'
import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import './PluginsPanel.css'

interface PluginsPanelProps {
  isHorizontal?: boolean
}

export function PluginsPanel({ isHorizontal = false }: PluginsPanelProps): JSX.Element {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const panelSettings = useLayoutStore((state) => state.panelSettings)
  const settings = panelSettings['plugins'] || { fontSize: 1.0, preferredSize: 25 }

  useEffect(() => {
    loadPlugins()

    const unsubscribe = api.plugins?.onChanged?.(() => {
      loadPlugins()
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const loadPlugins = async (): Promise<void> => {
    try {
      const pluginList = await api.plugins?.list?.() ?? []
      setPlugins(pluginList)
    } catch (error) {
      console.error('Failed to load plugins:', error)
      setPlugins([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (plugin: Plugin): Promise<void> => {
    if (actionInProgress) return
    setActionInProgress(plugin.id)

    try {
      await api.plugins?.toggle?.(plugin.id, !plugin.enabled)
      await loadPlugins()
    } catch (error) {
      console.error('Failed to toggle plugin:', error)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleUninstall = async (plugin: Plugin): Promise<void> => {
    if (actionInProgress) return
    if (!confirm(`Remove plugin "${plugin.name}"?`)) return

    setActionInProgress(plugin.id)

    try {
      await api.plugins?.uninstall?.(plugin.id)
      await loadPlugins()
    } catch (error) {
      console.error('Failed to uninstall plugin:', error)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleOpenMarketplace = (): void => {
    api.terminal.write('/plugins marketplace')
    setTimeout(() => {
      api.terminal.write('\r')
    }, 50)
  }

  const panelClass = `plugins-panel ${isHorizontal ? 'horizontal' : 'vertical'}`
  const panelStyle = { '--font-scale': settings.fontSize } as React.CSSProperties

  return (
    <div className={panelClass} style={panelStyle}>
      <div className="panel-header">
        <span className="panel-title">Plugins</span>
        <div className="header-actions">
          <PanelSettingsButton panelId="plugins" />
        </div>
      </div>

      {loading ? (
        <div className="plugins-loading">Loading plugins...</div>
      ) : plugins.length === 0 ? (
        <div className="plugins-empty">
          <p>No plugins installed</p>
        </div>
      ) : (
        <div className="plugins-list">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`plugin-item ${plugin.enabled ? 'enabled' : 'disabled'} ${actionInProgress === plugin.id ? 'loading' : ''}`}
            >
              <span className="plugin-icon">{plugin.icon || '🔌'}</span>
              <div className="plugin-info">
                <div className="plugin-name">
                  {plugin.name}
                  {plugin.version && <span className="plugin-version">v{plugin.version}</span>}
                </div>
                <div className="plugin-description">{plugin.description}</div>
              </div>
              <div className="plugin-actions">
                <button
                  className={`plugin-toggle-btn ${plugin.enabled ? 'on' : 'off'}`}
                  onClick={() => handleToggle(plugin)}
                  disabled={actionInProgress === plugin.id}
                  title={plugin.enabled ? 'Disable' : 'Enable'}
                >
                  {plugin.enabled ? 'On' : 'Off'}
                </button>
                <button
                  className="plugin-remove-btn"
                  onClick={() => handleUninstall(plugin)}
                  disabled={actionInProgress === plugin.id}
                  title="Remove"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="add-plugin-btn"
        onClick={handleOpenMarketplace}
        title="Browse Marketplace"
      >
        + Add Plugin
      </button>
    </div>
  )
}

export default PluginsPanel
