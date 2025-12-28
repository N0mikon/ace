import { CommandPanel } from './CommandPanel'
import { AgentPanel } from './AgentPanel'
import { McpPanel } from './McpPanel'
import { api } from '../../api'
import { Settings, ICON_SIZE } from '../common/icons'
import './Sidebar.css'

interface SidebarProps {
  onCommand: (command: string) => void
  onOpenSettings: () => void
  collapsed?: boolean
}

export function Sidebar({
  onCommand,
  onOpenSettings,
  collapsed = false
}: SidebarProps): JSX.Element {
  // Handle agent prompt injection - send text then Enter separately
  const handleInjectPrompt = (prompt: string): void => {
    api.terminal.write(prompt)
    setTimeout(() => {
      api.terminal.write('\r')
    }, 50)
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <AgentPanel onInjectPrompt={handleInjectPrompt} />
        <CommandPanel onCommand={onCommand} />
        <McpPanel />
      </div>
      <div className="sidebar-footer">
        <button className="settings-button" onClick={onOpenSettings} title="Settings (Ctrl+,)">
          <span className="settings-icon">
            <Settings size={ICON_SIZE.md} />
          </span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
