import { useState, useEffect, useCallback } from 'react'
import type { Agent } from '../../api/types'
import { api } from '../../api'
import { useLayoutStore } from '../../stores/layoutStore'
import { AgentEditor } from '../Editor/AgentEditor'
import { AgentPromptDialog } from '../Agent/AgentPromptDialog'
import { CreateAgentDialog } from '../common/CreateAgentDialog'
import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import { getAgentIcon, Pencil, ICON_SIZE } from '../common/icons'
import './AgentPanel.css'

interface AgentPanelProps {
  onInjectPrompt: (prompt: string) => void
  isHorizontal?: boolean
}

export function AgentPanel({ onInjectPrompt, isHorizontal = false }: AgentPanelProps): JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string } | null>(null)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [selectedAgentForPrompt, setSelectedAgentForPrompt] = useState<Agent | null>(null)

  const panelSettings = useLayoutStore((state) => state.panelSettings)
  const settings = panelSettings['agents'] || { fontSize: 1.0, preferredSize: 25 }

  const loadAgents = useCallback(async () => {
    setIsLoading(true)
    const data = await api.agents.list()
    setAgents(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadAgents()

    // Listen for agent file changes
    const unsubscribe = api.agents.onChanged(() => {
      loadAgents()
    })

    return () => {
      unsubscribe()
    }
  }, [loadAgents])

  const handleAgentClick = (agent: Agent): void => {
    setSelectedAgentForPrompt(agent)
    setPromptDialogOpen(true)
  }

  const handlePromptDialogRun = (prompt: string): void => {
    setPromptDialogOpen(false)
    setSelectedAgentForPrompt(null)
    onInjectPrompt(prompt)
  }

  const handlePromptDialogCancel = (): void => {
    setPromptDialogOpen(false)
    setSelectedAgentForPrompt(null)
  }

  const handleEditAgent = (agent: Agent, e: React.MouseEvent): void => {
    e.stopPropagation()
    setEditingAgent({ id: agent.id, name: agent.agent.name })
  }

  const panelClass = `agent-panel ${isHorizontal ? 'horizontal' : 'vertical'}`
  // Set CSS custom property for font scaling - used by CSS calc() rules
  const panelStyle = {
    '--font-scale': settings.fontSize
  } as React.CSSProperties

  return (
    <div className={panelClass} style={panelStyle}>
      <div className="panel-header">
        <span className="panel-title">Agents</span>
        <div className="header-actions">
          <PanelSettingsButton panelId="agents" />
        </div>
      </div>

      {isLoading ? (
        <div className="agent-loading">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="agent-empty">
          <p>No agents in this project.</p>
          <p className="hint">Import agents when creating a new project, or create one here.</p>
        </div>
      ) : (
        <div className="agent-list" role="list">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="agent-item"
              style={
                agent.agent.color ? { borderLeftColor: agent.agent.color, borderLeftWidth: 3 } : undefined
              }
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
              <span className="agent-icon">
                {(() => {
                  const IconComponent = getAgentIcon(agent.agent.icon)
                  return <IconComponent size={ICON_SIZE.md} />
                })()}
              </span>
              <div className="agent-info">
                <div className="agent-name">{agent.agent.name}</div>
                <div className="agent-description">{agent.agent.description}</div>
                {agent.agent.tools && (
                  <div className="agent-tools">
                    <span className="agent-tools-label">Tools:</span> {agent.agent.tools}
                  </div>
                )}
                {agent.agent.model && (
                  <div className="agent-model">
                    <span className="agent-model-label">Model:</span> {agent.agent.model}
                  </div>
                )}
              </div>
              {agent.agent.hotkey && <span className="agent-hotkey">{agent.agent.hotkey}</span>}
              <div className="agent-actions">
                <button
                  className="agent-action-button"
                  onClick={(e) => handleEditAgent(agent, e)}
                  title="Edit agent file"
                >
                  <Pencil size={ICON_SIZE.sm} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="add-agent-btn"
        onClick={() => setShowCreateDialog(true)}
        title="Create Agent"
      >
        + Add Agent
      </button>

      {editingAgent && (
        <AgentEditor
          isOpen={true}
          agentId={editingAgent.id}
          agentName={editingAgent.name}
          onClose={() => setEditingAgent(null)}
          onSaved={loadAgents}
        />
      )}

      <AgentPromptDialog
        isOpen={promptDialogOpen}
        agents={agents}
        selectedAgent={selectedAgentForPrompt}
        onRun={handlePromptDialogRun}
        onCancel={handlePromptDialogCancel}
      />

      <CreateAgentDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={loadAgents}
      />
    </div>
  )
}

export default AgentPanel
