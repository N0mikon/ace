import { useState, useEffect, useCallback } from 'react'
import type { Agent } from '../../../../preload/index.d'
import './AgentPanel.css'

interface AgentPanelProps {
  onInjectPrompt: (prompt: string) => void
}

export function AgentPanel({ onInjectPrompt }: AgentPanelProps): JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    prompt: ''
  })

  const loadAgents = useCallback(async () => {
    setIsLoading(true)
    const data = await window.agents?.list()
    setAgents(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadAgents()

    // Listen for agent file changes
    const unsubscribe = window.agents?.onChanged(() => {
      loadAgents()
    })

    return () => {
      unsubscribe?.()
    }
  }, [loadAgents])

  const handleAgentClick = async (agent: Agent): Promise<void> => {
    const prompt = agent.prompt.text
    if (prompt) {
      onInjectPrompt(prompt)
    }
  }

  const handleEditAgent = async (agentId: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await window.agents?.openFile(agentId)
  }

  const handleCreateAgent = async (): Promise<void> => {
    if (!newAgent.name.trim() || !newAgent.prompt.trim()) {
      return
    }

    const result = await window.agents?.create(
      newAgent.name.trim(),
      newAgent.description.trim(),
      newAgent.prompt.trim()
    )

    if (result?.success) {
      setNewAgent({ name: '', description: '', prompt: '' })
      setShowCreateForm(false)
      loadAgents()
    }
  }

  const getAgentIcon = (icon?: string): string => {
    // Map icon names to unicode characters
    const iconMap: Record<string, string> = {
      search: '\u{1F50D}',
      code: '\u{1F4BB}',
      edit: '\u{270F}',
      bug: '\u{1F41B}',
      test: '\u{2705}',
      docs: '\u{1F4DD}',
      review: '\u{1F440}',
      default: '\u{1F916}'
    }
    return iconMap[icon || 'default'] || iconMap.default
  }

  return (
    <div className="agent-panel">
      <div className="panel-header">
        <span className="panel-title">Agents</span>
        <div className="header-actions">
          <button
            className="header-button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            title="Create Agent"
          >
            +
          </button>
          <button className="header-button" onClick={loadAgents} title="Refresh">
            &#8635;
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="create-agent-form">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="Agent name..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={newAgent.description}
              onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
              placeholder="Brief description..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Prompt</label>
            <textarea
              className="form-textarea"
              value={newAgent.prompt}
              onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
              placeholder="Agent prompt text..."
            />
          </div>
          <div className="form-actions">
            <button className="form-button" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button className="form-button primary" onClick={handleCreateAgent}>
              Create
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="agent-loading">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="agent-empty">No agents yet. Click + to create one.</div>
      ) : (
        <div className="agent-list" role="list">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="agent-item"
              onClick={() => handleAgentClick(agent)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleAgentClick(agent)
                }
              }}
              title={agent.agent.description}
              role="listitem"
              tabIndex={0}
              aria-label={`${agent.agent.name}: ${agent.agent.description}`}
            >
              <span className="agent-icon">{getAgentIcon(agent.agent.icon)}</span>
              <div className="agent-info">
                <div className="agent-name">{agent.agent.name}</div>
                <div className="agent-description">{agent.agent.description}</div>
              </div>
              {agent.agent.hotkey && <span className="agent-hotkey">{agent.agent.hotkey}</span>}
              <div className="agent-actions">
                <button
                  className="agent-action-button"
                  onClick={(e) => handleEditAgent(agent.id, e)}
                  title="Edit agent file"
                >
                  &#9998;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AgentPanel
