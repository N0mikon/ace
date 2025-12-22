import './CommandPanel.css'

interface QuickCommand {
  name: string
  command: string
  icon?: string
  description?: string
}

const DEFAULT_COMMANDS: QuickCommand[] = [
  { name: 'Exit', command: '/exit', icon: '⏹', description: 'Exit Claude Code' },
  { name: 'Compact', command: '/compact', icon: '📦', description: 'Compact context' },
  { name: 'Clear', command: '/clear', icon: '🗑', description: 'Clear conversation' },
  { name: 'Help', command: '/help', icon: '❓', description: 'Show help' },
  { name: 'Cost', command: '/cost', icon: '💰', description: 'Show token cost' },
  { name: 'Retry', command: '/retry', icon: '🔄', description: 'Retry last message' }
]

interface CommandPanelProps {
  onCommand: (command: string) => void
  commands?: QuickCommand[]
}

export function CommandPanel({
  onCommand,
  commands = DEFAULT_COMMANDS
}: CommandPanelProps): JSX.Element {
  const handleClick = (command: string): void => {
    // Send command with newline to execute it
    onCommand(command + '\n')
  }

  return (
    <div className="command-panel">
      <div className="panel-header">
        <span className="panel-title">Quick Commands</span>
      </div>
      <div className="command-grid">
        {commands.map((cmd) => (
          <button
            key={cmd.name}
            className="command-button"
            onClick={() => handleClick(cmd.command)}
            title={cmd.description}
          >
            {cmd.icon && <span className="command-icon">{cmd.icon}</span>}
            <span className="command-name">{cmd.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default CommandPanel
