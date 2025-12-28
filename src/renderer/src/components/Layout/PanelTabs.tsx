/**
 * Panel Tabs Component
 * Tab bar for switching between multiple panels in the same area
 */

import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import { PanelIcons, ChevronLeft, ChevronRight, ChevronDown, ICON_SIZE } from '../common/icons'
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
        {panels.map((id) => {
          const IconComponent = PanelIcons[id] || PanelIcons.default
          return (
            <button
              key={id}
              className={`panel-tab ${id === activePanel ? 'active' : ''}`}
              onClick={() => onSelectPanel(id)}
              title={PANEL_LABELS[id] || id}
            >
              <span className="panel-tab-icon">
                <IconComponent size={ICON_SIZE.md} />
              </span>
              <span className="panel-tab-label">{PANEL_LABELS[id] || id}</span>
            </button>
          )
        })}
      </div>
      <div className="panel-tabs-actions">
        <PanelSettingsButton panelId={activePanel} />
        <button
          className="panel-collapse-btn"
          onClick={onCollapse}
          title="Collapse panel area"
        >
          {position === 'left' ? (
            <ChevronLeft size={ICON_SIZE.sm} />
          ) : position === 'right' ? (
            <ChevronRight size={ICON_SIZE.sm} />
          ) : (
            <ChevronDown size={ICON_SIZE.sm} />
          )}
        </button>
      </div>
    </div>
  )
}

export default PanelTabs
