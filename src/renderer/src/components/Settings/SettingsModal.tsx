import { useState, useEffect, useRef, useCallback } from 'react'
import type { AceConfig } from '../../api/types'
import { api } from '../../api'
import { HotkeyEditor } from './HotkeyEditor'
import { LayoutSettings } from './LayoutSettings'
import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps): JSX.Element | null {
  const [config, setConfig] = useState<AceConfig | null>(null)
  const [configPaths, setConfigPaths] = useState<{ configDir: string; configFile: string } | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<'general' | 'claude' | 'hotkeys' | 'paths' | 'layout'>('general')
  const [hasChanges, setHasChanges] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle Escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      loadConfig()
      document.addEventListener('keydown', handleKeyDown)
      modalRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const loadConfig = async (): Promise<void> => {
    const cfg = await api.config.get()
    const paths = await api.config.getPaths()
    setConfig(cfg)
    setConfigPaths(paths)
  }

  const handleChange = (path: string, value: unknown): void => {
    if (!config) return

    // Update local state
    const keys = path.split('.')
    const newConfig = { ...config }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = newConfig
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = { ...obj[keys[i]] }
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value

    // Apply theme immediately for live preview
    if (path === 'general.theme') {
      document.documentElement.setAttribute('data-theme', value as string)
    }

    setConfig(newConfig)
    setHasChanges(true)
  }

  const handleSave = async (): Promise<void> => {
    if (!config) return

    await api.config.update(config)
    setHasChanges(false)
    onClose()
  }

  const handleCancel = async (): Promise<void> => {
    // Revert theme to saved config value if changed
    if (hasChanges) {
      const savedTheme = await api.config.getValue<string>('general.theme')
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme)
      }
    }
    setHasChanges(false)
    onClose()
  }

  if (!isOpen || !config) return null

  return (
    <div className="settings-overlay" onClick={handleCancel} role="dialog" aria-modal="true">
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
        aria-labelledby="settings-title"
      >
        <div className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button className="close-button" onClick={handleCancel} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`tab ${activeTab === 'claude' ? 'active' : ''}`}
            onClick={() => setActiveTab('claude')}
          >
            Claude Code
          </button>
          <button
            className={`tab ${activeTab === 'hotkeys' ? 'active' : ''}`}
            onClick={() => setActiveTab('hotkeys')}
          >
            Hotkeys
          </button>
          <button
            className={`tab ${activeTab === 'paths' ? 'active' : ''}`}
            onClick={() => setActiveTab('paths')}
          >
            Paths
          </button>
          <button
            className={`tab ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            Layout
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Theme</label>
                <select
                  value={config.general.theme}
                  onChange={(e) => handleChange('general.theme', e.target.value)}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'claude' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Claude Code Config Path</label>
                <input
                  type="text"
                  value={config.claudeCode.configPath}
                  onChange={(e) => handleChange('claudeCode.configPath', e.target.value)}
                />
                <span className="hint">Path to your Claude Code configuration directory</span>
              </div>
              <div className="setting-group">
                <label>MCP Config Path</label>
                <input
                  type="text"
                  value={config.claudeCode.mcpConfig}
                  onChange={(e) => handleChange('claudeCode.mcpConfig', e.target.value)}
                />
                <span className="hint">Path to your MCP servers configuration file</span>
              </div>
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="settings-section">
              <HotkeyEditor onClose={onClose} />
            </div>
          )}

          {activeTab === 'paths' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Config Directory</label>
                <input type="text" value={configPaths?.configDir || ''} disabled />
              </div>
              <div className="setting-group">
                <label>Config File</label>
                <input type="text" value={configPaths?.configFile || ''} disabled />
              </div>
              <div className="setting-group">
                <label>Logs Directory</label>
                <input
                  type="text"
                  value={config.logging.directory}
                  onChange={(e) => handleChange('logging.directory', e.target.value)}
                />
              </div>
              <div className="setting-group">
                <label>Agents Directory</label>
                <input
                  type="text"
                  value={config.agents.globalDirectory}
                  onChange={(e) => handleChange('agents.globalDirectory', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="settings-section">
              <LayoutSettings />
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
