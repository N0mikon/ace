import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import { useLayoutStore } from '../../stores/layoutStore'
import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import { CreateCommandDialog } from '../common/CreateCommandDialog'
import {
  BuiltInCommandIcons, getCommandIcon, ChevronRight, ChevronDown,
  ICON_SIZE
} from '../common/icons'
import type { LucideIcon } from 'lucide-react'
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
      { name: 'Clear', command: '/clear', icon: 'clear', description: 'Clear conversation' },
      { name: 'Compact', command: '/compact', icon: 'compact', description: 'Compact context' },
      { name: 'Resume', command: '/resume', icon: 'resume', description: 'Resume previous session' }
    ]
  },
  {
    id: 'info',
    label: 'Info',
    commands: [
      { name: 'Help', command: '/help', icon: 'help', description: 'Show help' },
      { name: 'Cost', command: '/cost', icon: 'cost', description: 'Show token cost' }
    ]
  },
  {
    id: 'context',
    label: 'Context',
    commands: [
      { name: 'Context', command: '/context', icon: 'context', description: 'Add context files' },
      { name: 'Memory', command: '/memory', icon: 'memory', description: 'Memory commands' }
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    commands: [
      { name: 'Review', command: '/review', icon: 'review', description: 'Review code' },
      { name: 'Model', command: '/model', icon: 'model', description: 'Change model' },
      { name: 'Doctor', command: '/doctor', icon: 'doctor', description: 'Run diagnostics' }
    ]
  }
]

// Helper to get icon component for a command
const getCommandIconComponent = (iconKey?: string): LucideIcon | null => {
  if (!iconKey) return null
  return BuiltInCommandIcons[iconKey] || getCommandIcon(iconKey)
}

interface CommandPanelProps {
  onCommand: (command: string) => void
  categories?: CommandCategory[]
  isHorizontal?: boolean
}

export function CommandPanel({
  onCommand,
  categories = COMMAND_CATEGORIES,
  isHorizontal = false
}: CommandPanelProps): JSX.Element {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => loadCollapsedState())
  const [customCommands, setCustomCommands] = useState<QuickCommand[]>([])
  const [projectCommands, setProjectCommands] = useState<QuickCommand[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const panelSettings = useLayoutStore((state) => state.panelSettings)
  const settings = panelSettings['commands'] || { fontSize: 1.0, preferredSize: 20 }

  // Load custom commands from config
  const loadCustomCommands = useCallback(async () => {
    const commands = await api.config.getValue<QuickCommand[]>('quickCommands')
    setCustomCommands(commands || [])
  }, [])

  // Load project commands (workflows) from .claude/commands/
  const loadProjectCommands = useCallback(async () => {
    const commands = await api.commands?.list?.() ?? []
    // Map Command type to QuickCommand format
    setProjectCommands(
      commands.map((cmd) => ({
        name: cmd.name,
        command: '/' + cmd.id,
        icon: cmd.icon,
        description: cmd.description
      }))
    )
  }, [])

  useEffect(() => {
    loadCustomCommands()
    loadProjectCommands()
  }, [loadCustomCommands, loadProjectCommands])

  // Save collapsed state when it changes
  useEffect(() => {
    saveCollapsedState(collapsedCategories)
  }, [collapsedCategories])

  // Merge built-in categories with workflows and custom commands
  const allCategories: CommandCategory[] = [
    ...categories,
    ...(projectCommands.length > 0 ? [{
      id: 'workflows',
      label: 'Workflows',
      commands: projectCommands
    }] : []),
    ...(customCommands.length > 0 ? [{
      id: 'custom',
      label: 'Custom',
      commands: customCommands
    }] : [])
  ]

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

  const panelClass = `command-panel ${isHorizontal ? 'horizontal' : 'vertical'}`
  const panelStyle = { '--font-scale': settings.fontSize } as React.CSSProperties

  return (
    <div className={panelClass} style={panelStyle}>
      <div className="panel-header">
        <span className="panel-title">Quick Commands</span>
        <div className="header-actions">
          <PanelSettingsButton panelId="commands" />
        </div>
      </div>
      <div className="command-categories">
        {allCategories.map((category) => {
          const isCollapsed = collapsedCategories.has(category.id)
          return (
            <div key={category.id} className={`command-category ${isCollapsed ? 'collapsed' : ''}`}>
              <button
                className="category-header"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={!isCollapsed}
              >
                <span className="category-arrow">
                  {isCollapsed ? (
                    <ChevronRight size={ICON_SIZE.sm} />
                  ) : (
                    <ChevronDown size={ICON_SIZE.sm} />
                  )}
                </span>
                <span className="category-label">{category.label}</span>
                <span className="category-count">{category.commands.length}</span>
              </button>
              {!isCollapsed && (
                <div className="command-grid">
                  {category.commands.map((cmd) => {
                    const IconComponent = getCommandIconComponent(cmd.icon)
                    return (
                      <button
                        key={cmd.name}
                        className="command-button"
                        onClick={() => handleClick(cmd.command)}
                        title={cmd.description}
                      >
                        {IconComponent && (
                          <span className="command-icon">
                            <IconComponent size={ICON_SIZE.sm} />
                          </span>
                        )}
                        <span className="command-name">{cmd.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        className="add-command-btn"
        onClick={() => setShowCreateDialog(true)}
        title="Create Command"
      >
        + Add Command
      </button>

      <CreateCommandDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={loadCustomCommands}
      />
    </div>
  )
}

export default CommandPanel
