import './CommandPanel.css'

interface QuickCommand {
  name: string
  command: string
  icon?: string
  description?: string
  category?: string
}

const DEFAULT_COMMANDS: QuickCommand[] = [
  // Session commands
  { name: 'Exit', command: '/exit', icon: '⏹', description: 'Exit Claude Code', category: 'session' },
  { name: 'Clear', command: '/clear', icon: '🗑', description: 'Clear conversation', category: 'session' },
  { name: 'Compact', command: '/compact', icon: '📦', description: 'Compact context', category: 'session' },
  { name: 'Resume', command: '/resume', icon: '▶', description: 'Resume previous session', category: 'session' },
  { name: 'Retry', command: '/retry', icon: '🔄', description: 'Retry last message', category: 'session' },

  // Info commands
  { name: 'Help', command: '/help', icon: '❓', description: 'Show help', category: 'info' },
  { name: 'Cost', command: '/cost', icon: '💰', description: 'Show token cost', category: 'info' },
  { name: 'Status', command: '/status', icon: '📊', description: 'Show status', category: 'info' },
  { name: 'Doctor', command: '/doctor', icon: '🩺', description: 'Run diagnostics', category: 'info' },
  { name: 'Config', command: '/config', icon: '⚙', description: 'Show configuration', category: 'info' },

  // Context commands
  { name: 'Context', command: '/context', icon: '📎', description: 'Add context files', category: 'context' },
  { name: 'Memory', command: '/memory', icon: '🧠', description: 'Memory commands', category: 'context' },
  { name: 'MCP', command: '/mcp', icon: '🔌', description: 'MCP server commands', category: 'context' },

  // Code commands
  { name: 'Review', command: '/review', icon: '👁', description: 'Review code', category: 'code' },
  { name: 'PR Comments', command: '/pr-comments', icon: '💬', description: 'Get PR comments', category: 'code' },
  { name: 'Init', command: '/init', icon: '🚀', description: 'Initialize project', category: 'code' },

  // Settings commands
  { name: 'Model', command: '/model', icon: '🤖', description: 'Change model', category: 'settings' },
  { name: 'Vim', command: '/vim', icon: '⌨', description: 'Toggle vim mode', category: 'settings' },
  { name: 'Theme', command: '/theme', icon: '🎨', description: 'Change theme', category: 'settings' },
  { name: 'Permissions', command: '/permissions', icon: '🔐', description: 'Manage permissions', category: 'settings' },
  { name: 'Terminal', command: '/terminal-setup', icon: '💻', description: 'Setup terminal', category: 'settings' },

  // Account commands
  { name: 'Login', command: '/login', icon: '🔑', description: 'Log in to Anthropic', category: 'account' },
  { name: 'Logout', command: '/logout', icon: '🚪', description: 'Log out', category: 'account' },
  { name: 'Bug', command: '/bug', icon: '🐛', description: 'Report a bug', category: 'account' }
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
