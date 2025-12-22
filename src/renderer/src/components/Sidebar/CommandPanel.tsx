import './CommandPanel.css'

interface QuickCommand {
  name: string
  command: string
  icon?: string
  description?: string
}

interface CommandCategory {
  id: string
  label: string
  commands: QuickCommand[]
}

const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    id: 'session',
    label: 'Session',
    commands: [
      { name: 'Exit', command: '/exit', icon: '⏹', description: 'Exit Claude Code' },
      { name: 'Clear', command: '/clear', icon: '🗑', description: 'Clear conversation' },
      { name: 'Compact', command: '/compact', icon: '📦', description: 'Compact context' },
      { name: 'Resume', command: '/resume', icon: '▶', description: 'Resume previous session' },
      { name: 'Retry', command: '/retry', icon: '🔄', description: 'Retry last message' }
    ]
  },
  {
    id: 'info',
    label: 'Info',
    commands: [
      { name: 'Help', command: '/help', icon: '❓', description: 'Show help' },
      { name: 'Cost', command: '/cost', icon: '💰', description: 'Show token cost' },
      { name: 'Status', command: '/status', icon: '📊', description: 'Show status' },
      { name: 'Doctor', command: '/doctor', icon: '🩺', description: 'Run diagnostics' },
      { name: 'Config', command: '/config', icon: '⚙', description: 'Show configuration' }
    ]
  },
  {
    id: 'context',
    label: 'Context',
    commands: [
      { name: 'Context', command: '/context', icon: '📎', description: 'Add context files' },
      { name: 'Memory', command: '/memory', icon: '🧠', description: 'Memory commands' },
      { name: 'MCP', command: '/mcp', icon: '🔌', description: 'MCP server commands' }
    ]
  },
  {
    id: 'code',
    label: 'Code',
    commands: [
      { name: 'Review', command: '/review', icon: '👁', description: 'Review code' },
      { name: 'PR Comments', command: '/pr-comments', icon: '💬', description: 'Get PR comments' },
      { name: 'Init', command: '/init', icon: '🚀', description: 'Initialize project' }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    commands: [
      { name: 'Model', command: '/model', icon: '🤖', description: 'Change model' },
      { name: 'Vim', command: '/vim', icon: '⌨', description: 'Toggle vim mode' },
      { name: 'Theme', command: '/theme', icon: '🎨', description: 'Change theme' },
      { name: 'Permissions', command: '/permissions', icon: '🔐', description: 'Manage permissions' },
      { name: 'Terminal', command: '/terminal-setup', icon: '💻', description: 'Setup terminal' }
    ]
  },
  {
    id: 'account',
    label: 'Account',
    commands: [
      { name: 'Login', command: '/login', icon: '🔑', description: 'Log in to Anthropic' },
      { name: 'Logout', command: '/logout', icon: '🚪', description: 'Log out' },
      { name: 'Bug', command: '/bug', icon: '🐛', description: 'Report a bug' }
    ]
  }
]

interface CommandPanelProps {
  onCommand: (command: string) => void
  categories?: CommandCategory[]
}

export function CommandPanel({
  onCommand,
  categories = COMMAND_CATEGORIES
}: CommandPanelProps): JSX.Element {
  const handleClick = (command: string): void => {
    onCommand(command + '\n')
  }

  return (
    <div className="command-panel">
      <div className="panel-header">
        <span className="panel-title">Quick Commands</span>
      </div>
      <div className="command-categories">
        {categories.map((category) => (
          <div key={category.id} className="command-category">
            <div className="category-header">{category.label}</div>
            <div className="command-grid">
              {category.commands.map((cmd) => (
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
        ))}
      </div>
    </div>
  )
}

export default CommandPanel
