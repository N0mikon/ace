/**
 * Panel Area Component
 * Renders panels assigned to a specific position with tab switching
 */

import { useLayoutStore } from '../../stores/layoutStore'
import { api } from '../../api'
import { PanelTabs } from './PanelTabs'
import { AgentPanel } from '../Sidebar/AgentPanel'
import { McpPanel } from '../Sidebar/McpPanel'
import { CommandPanel } from '../Sidebar/CommandPanel'
import './PanelArea.css'

interface PanelAreaProps {
  position: 'top' | 'left' | 'bottom' | 'right'
}

// Helper to write to terminal
const writeToTerminal = (text: string): void => {
  api.terminal.write(text)
}

// Inject prompt for agents (adds carriage return to execute)
const handleInjectPrompt = (prompt: string): void => {
  writeToTerminal(prompt + '\r')
}

// Execute command
const handleCommand = (command: string): void => {
  writeToTerminal(command)
}

export function PanelArea({ position }: PanelAreaProps): JSX.Element {
  const { panels, activeTabByArea, setActiveTab, toggleAreaCollapsed } = useLayoutStore()

  // Get panels assigned to this position, sorted by order
  const areaPanels = Object.entries(panels)
    .filter(([_, config]) => config.position === position)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id]) => id)

  // Ensure activePanel is actually in this area, otherwise use first panel
  const storedActivePanel = activeTabByArea[position]
  const activePanel = areaPanels.includes(storedActivePanel) ? storedActivePanel : areaPanels[0]

  // Render the active panel component
  const renderPanel = (panelId: string): JSX.Element | null => {
    switch (panelId) {
      case 'agents':
        return <AgentPanel onInjectPrompt={handleInjectPrompt} />
      case 'commands':
        return <CommandPanel onCommand={handleCommand} />
      case 'mcp':
        return <McpPanel />
      default:
        return null
    }
  }

  if (areaPanels.length === 0) {
    return <div className="panel-area empty" />
  }

  return (
    <div className={`panel-area panel-area-${position}`}>
      <PanelTabs
        panels={areaPanels}
        activePanel={activePanel}
        position={position}
        onSelectPanel={(id) => setActiveTab(position, id)}
        onCollapse={() => toggleAreaCollapsed(position)}
      />
      <div className="panel-area-content">
        {renderPanel(activePanel)}
      </div>
    </div>
  )
}

export default PanelArea
