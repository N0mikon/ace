/**
 * Panel Tabs Component
 * Tab bar for switching between multiple panels in the same area
 */

import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import './PanelTabs.css'

interface PanelTabsProps {
  panels: string[]
  activePanel: string
  position: 'top' | 'left' | 'bottom' | 'right'
  onSelectPanel: (id: string) => void
  onCollapse: () => void
}

const PANEL_LABELS: Record<string, string> = {
  project: 'Project',
  agents: 'Agents',
  commands: 'Commands',
  mcp: 'MCP',
  sessions: 'Sessions',
  skills: 'Skills',
  plugins: 'Plugins'
}

const PANEL_ICONS: Record<string, string> = {
  project: '\u{1F4C1}', // folder
  agents: '\u{1F916}', // robot
  commands: '\u{2318}', // command
  mcp: '\u{1F50C}', // plug
  sessions: '\u{1F4CB}', // clipboard
  skills: '\u{2728}', // sparkles
  plugins: '\u{1F9E9}' // puzzle piece
}

export function PanelTabs({
  panels,
  activePanel,
  position,
  onSelectPanel,
  onCollapse
}: PanelTabsProps): JSX.Element {
  const isVertical = position === 'left' || position === 'right'

  return (
    <div className={`panel-tabs ${isVertical ? 'vertical' : 'horizontal'}`}>
      <div className="panel-tabs-list">
        {panels.map((id) => (
          <button
            key={id}
            className={`panel-tab ${id === activePanel ? 'active' : ''}`}
            onClick={() => onSelectPanel(id)}
            title={PANEL_LABELS[id] || id}
          >
            <span className="panel-tab-icon">{PANEL_ICONS[id] || '\u{1F4E6}'}</span>
            <span className="panel-tab-label">{PANEL_LABELS[id] || id}</span>
          </button>
        ))}
      </div>
      <div className="panel-tabs-actions">
        <PanelSettingsButton panelId={activePanel} />
        <button
          className="panel-collapse-btn"
          onClick={onCollapse}
          title="Collapse panel area"
        >
          {position === 'left' ? '\u25C0' : position === 'right' ? '\u25B6' : '\u25BC'}
        </button>
      </div>
    </div>
  )
}

export default PanelTabs
