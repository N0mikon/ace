import { CommandPanel } from './CommandPanel'
import { SessionPanel } from './SessionPanel'
import { AgentPanel } from './AgentPanel'
import { McpPanel } from './McpPanel'
import { ProjectPanel } from './ProjectPanel'
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
  // Handle agent prompt injection - write to terminal with carriage return to execute
  const handleInjectPrompt = (prompt: string): void => {
    window.terminal?.write(prompt + '\r')
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <ProjectPanel />
        <AgentPanel onInjectPrompt={handleInjectPrompt} />
        <CommandPanel onCommand={onCommand} />
        <McpPanel />
        <SessionPanel />
      </div>
      <div className="sidebar-footer">
        <button className="settings-button" onClick={onOpenSettings} title="Settings (Ctrl+,)">
          <span className="settings-icon">&#9881;</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
