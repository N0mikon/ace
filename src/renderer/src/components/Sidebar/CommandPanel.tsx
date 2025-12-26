import { useState, useEffect } from 'react'
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

const STORAGE_KEY = 'ace-collapsed-categories'

const loadCollapsedState = (): Set<string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return new Set(JSON.parse(saved))
    }
  } catch (e) {
    console.error('Failed to load collapsed state:', e)
  }
  return new Set()
}

const saveCollapsedState = (collapsed: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]))
  } catch (e) {
    console.error('Failed to save collapsed state:', e)
  }
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => loadCollapsedState())

  // Save collapsed state when it changes
  useEffect(() => {
    saveCollapsedState(collapsedCategories)
  }, [collapsedCategories])

  const handleClick = (command: string): void => {
    // Send command text first, then Enter separately after a small delay
    // This mimics natural typing and works better with Claude Code's input handling
    onCommand(command)
    setTimeout(() => {
      onCommand('\r')
    }, 50)
  }

  const toggleCategory = (categoryId: string): void => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  return (
    <div className="command-panel">
      <div className="panel-header">
        <span className="panel-title">Quick Commands</span>
      </div>
      <div className="command-categories">
        {categories.map((category) => {
          const isCollapsed = collapsedCategories.has(category.id)
          return (
            <div key={category.id} className={`command-category ${isCollapsed ? 'collapsed' : ''}`}>
              <button
                className="category-header"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="category-arrow">{isCollapsed ? '▶' : '▼'}</span>
                <span className="category-label">{category.label}</span>
                <span className="category-count">{category.commands.length}</span>
              </button>
              {!isCollapsed && (
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CommandPanel
