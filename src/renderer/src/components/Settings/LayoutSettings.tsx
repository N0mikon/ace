/**
 * Layout Settings Component
 * UI for configuring panel positions
 */

import { useLayoutStore, PanelPosition } from '../../stores/layoutStore'
import './LayoutSettings.css'

const POSITIONS: PanelPosition[] = ['left', 'right', 'top', 'bottom', 'hidden']
const PANEL_IDS = ['agents', 'commands', 'mcp', 'skills', 'plugins']

const PANEL_LABELS: Record<string, string> = {
  agents: 'Agents',
  commands: 'Quick Commands',
  mcp: 'MCP Servers',
  skills: 'Skills',
  plugins: 'Plugins'
}

const POSITION_LABELS: Record<PanelPosition, string> = {
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
  hidden: 'Hidden'
}

export function LayoutSettings(): JSX.Element {
  const { panels, setPanelPosition, resetLayout } = useLayoutStore()

  return (
    <div className="layout-settings">
      <div className="settings-section">
        <h3 className="section-title">Panel Positions</h3>
        <p className="section-description">
          Choose where each panel should appear. Panels in the same position will show as tabs.
        </p>

        <div className="panel-position-list">
          {PANEL_IDS.map((id) => (
            <div key={id} className="panel-position-row">
              <label className="panel-label">{PANEL_LABELS[id]}</label>
              <select
                className="position-select"
                value={panels[id]?.position || 'hidden'}
                onChange={(e) => setPanelPosition(id, e.target.value as PanelPosition)}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {POSITION_LABELS[pos]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Layout Preview</h3>
        <LayoutPreview />
      </div>

      <div className="settings-actions">
        <button className="reset-button" onClick={resetLayout}>
          Reset to Default Layout
        </button>
      </div>
    </div>
  )
}

function LayoutPreview(): JSX.Element {
  const { panels } = useLayoutStore()

  const getPanelsAt = (position: PanelPosition): string[] => {
    return Object.entries(panels)
      .filter(([_, config]) => config.position === position)
      .map(([id]) => PANEL_LABELS[id] || id)
  }

  const topPanels = getPanelsAt('top')
  const leftPanels = getPanelsAt('left')
  const rightPanels = getPanelsAt('right')
  const bottomPanels = getPanelsAt('bottom')

  return (
    <div className="layout-preview">
      {topPanels.length > 0 && (
        <div className="preview-area preview-top">
          <span className="preview-label">{topPanels.join(', ')}</span>
        </div>
      )}
      <div className="preview-middle">
        {leftPanels.length > 0 && (
          <div className="preview-area preview-left">
            <span className="preview-label">{leftPanels.join(', ')}</span>
          </div>
        )}
        <div className="preview-center">
          <span className="preview-label">Terminal</span>
        </div>
        {rightPanels.length > 0 && (
          <div className="preview-area preview-right">
            <span className="preview-label">{rightPanels.join(', ')}</span>
          </div>
        )}
      </div>
      {bottomPanels.length > 0 && (
        <div className="preview-area preview-bottom">
          <span className="preview-label">{bottomPanels.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

export default LayoutSettings
