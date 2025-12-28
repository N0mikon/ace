/**
 * New Project Wizard
 * Multi-step wizard for creating new projects with agent selection
 */

import { useState, useEffect } from 'react'
import type { Agent, McpServerInfo, Command } from '../../api/types'
import { api } from '../../api'
import { FolderOpen, X, ICON_SIZE } from '../common/icons'
import './NewProjectWizard.css'

interface NewProjectWizardProps {
  onComplete: (projectPath: string) => void
  onCancel: () => void
}

type WizardStep = 'folder' | 'agents' | 'commands' | 'mcp' | 'confirm'

export function NewProjectWizard({ onComplete, onCancel }: NewProjectWizardProps): JSX.Element {
  const [step, setStep] = useState<WizardStep>('folder')
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [availableCommands, setAvailableCommands] = useState<Command[]>([])
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set())
  const [mcpServers, setMcpServers] = useState<McpServerInfo[]>([])
  const [selectedMcpServers, setSelectedMcpServers] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available agents, commands, and global MCP servers
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Use listAllAvailable to get global + default agents for selection
        const agents = await api.agents.listAllAvailable()
        // Use listAllAvailable to get default commands for selection
        const commands = await api.commands.listAllAvailable()
        // Use getGlobalServers to get globally configured MCP servers
        const servers = await api.mcp.getGlobalServers()
        setAvailableAgents(agents)
        setAvailableCommands(commands)
        setMcpServers(servers)
      } catch (err) {
        console.error('Failed to load agents/commands/MCP:', err)
      }
    }
    loadData()
  }, [])

  const handleSelectFolder = async (): Promise<void> => {
    const path = await api.projects.openDialog()
    if (path) {
      setProjectPath(path)
      // Extract project name from path
      const name = path.split(/[/\\]/).pop() || 'Project'
      setProjectName(name)
      setStep('agents')
    }
  }

  const handleToggleAgent = (agentId: string): void => {
    setSelectedAgents((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  const handleSelectAllAgents = (): void => {
    setSelectedAgents(new Set(availableAgents.map((a) => a.id)))
  }

  const handleDeselectAllAgents = (): void => {
    setSelectedAgents(new Set())
  }

  const handleToggleMcpServer = (serverName: string): void => {
    setSelectedMcpServers((prev) => {
      const next = new Set(prev)
      if (next.has(serverName)) {
        next.delete(serverName)
      } else {
        next.add(serverName)
      }
      return next
    })
  }

  const handleSelectAllMcpServers = (): void => {
    setSelectedMcpServers(new Set(mcpServers.map((s) => s.name)))
  }

  const handleDeselectAllMcpServers = (): void => {
    setSelectedMcpServers(new Set())
  }

  const handleToggleCommand = (commandId: string): void => {
    setSelectedCommands((prev) => {
      const next = new Set(prev)
      if (next.has(commandId)) {
        next.delete(commandId)
      } else {
        next.add(commandId)
      }
      return next
    })
  }

  const handleSelectAllCommands = (): void => {
    setSelectedCommands(new Set(availableCommands.map((c) => c.id)))
  }

  const handleDeselectAllCommands = (): void => {
    setSelectedCommands(new Set())
  }

  const handleCreate = async (): Promise<void> => {
    if (!projectPath) return

    setIsCreating(true)
    setError(null)

    try {
      // Initialize project
      await api.projects.initializeAce(projectPath)

      // Copy selected agents to project
      for (const agentId of selectedAgents) {
        const result = await api.agents.copyToProject(agentId, projectPath)
        if (!result.success) {
          console.warn(`Failed to copy agent ${agentId}: ${result.error}`)
        }
      }

      // Copy selected commands to project
      for (const commandId of selectedCommands) {
        const result = await api.commands.copyToProject(commandId, projectPath)
        if (!result.success) {
          console.warn(`Failed to copy command ${commandId}: ${result.error}`)
        }
      }

      // Copy selected MCP servers to project
      for (const serverName of selectedMcpServers) {
        const result = await api.mcp.copyToProject(serverName, projectPath)
        if (!result.success) {
          console.warn(`Failed to copy MCP server ${serverName}: ${result.error}`)
        }
      }

      onComplete(projectPath)
    } catch (err) {
      setError(String(err))
      setIsCreating(false)
    }
  }

  const renderFolderStep = (): JSX.Element => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">Select Project Folder</h3>
        <p className="step-description">
          Choose a folder for your new project. ACE will create configuration files and a local
          agents directory.
        </p>
      </div>

      <div className="step-content">
        {projectPath ? (
          <div className="folder-selected">
            <span className="folder-icon"><FolderOpen size={ICON_SIZE.lg} /></span>
            <div className="folder-info">
              <span className="folder-name">{projectName}</span>
              <span className="folder-path">{projectPath}</span>
            </div>
            <button className="change-button" onClick={handleSelectFolder}>
              Change
            </button>
          </div>
        ) : (
          <button className="select-folder-button" onClick={handleSelectFolder}>
            <span className="button-icon"><FolderOpen size={ICON_SIZE.lg} /></span>
            <span>Choose Folder...</span>
          </button>
        )}
      </div>

      <div className="step-actions">
        <button className="wizard-button secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="wizard-button primary"
          onClick={() => setStep('agents')}
          disabled={!projectPath}
        >
          Next
        </button>
      </div>
    </div>
  )

  const renderAgentsStep = (): JSX.Element => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">Import Agents</h3>
        <p className="step-description">
          Select agents to copy to your project. These will be available locally in{' '}
          <code>.claude/agents/</code>
        </p>
      </div>

      <div className="step-content">
        <div className="agents-header">
          <span className="agents-count">
            {selectedAgents.size} of {availableAgents.length} selected
          </span>
          <div className="agents-actions">
            <button className="text-button" onClick={handleSelectAllAgents}>
              Select All
            </button>
            <span className="divider">|</span>
            <button className="text-button" onClick={handleDeselectAllAgents}>
              None
            </button>
          </div>
        </div>

        <div className="agents-list">
          {availableAgents.length === 0 ? (
            <div className="agents-empty">
              <p>No agents available.</p>
              <p className="hint">Create agents in the global directory or use default agents.</p>
            </div>
          ) : (
            availableAgents.map((agent) => (
              <label key={agent.id} className="agent-item">
                <input
                  type="checkbox"
                  checked={selectedAgents.has(agent.id)}
                  onChange={() => handleToggleAgent(agent.id)}
                />
                <div className="agent-info">
                  <span className="agent-name">{agent.agent.name}</span>
                  <span className="agent-description">{agent.agent.description}</span>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="step-actions">
        <button className="wizard-button secondary" onClick={() => setStep('folder')}>
          Back
        </button>
        <button className="wizard-button primary" onClick={() => setStep('commands')}>
          Next
        </button>
      </div>
    </div>
  )

  const renderCommandsStep = (): JSX.Element => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">Import Commands</h3>
        <p className="step-description">
          Select commands to copy to your project. These will be available locally in{' '}
          <code>.claude/commands/</code>
        </p>
      </div>

      <div className="step-content">
        <div className="agents-header">
          <span className="agents-count">
            {selectedCommands.size} of {availableCommands.length} selected
          </span>
          <div className="agents-actions">
            <button className="text-button" onClick={handleSelectAllCommands}>
              Select All
            </button>
            <span className="divider">|</span>
            <button className="text-button" onClick={handleDeselectAllCommands}>
              None
            </button>
          </div>
        </div>

        <div className="agents-list">
          {availableCommands.length === 0 ? (
            <div className="agents-empty">
              <p>No commands available.</p>
            </div>
          ) : (
            availableCommands.map((command) => (
              <label key={command.id} className="agent-item">
                <input
                  type="checkbox"
                  checked={selectedCommands.has(command.id)}
                  onChange={() => handleToggleCommand(command.id)}
                />
                <div className="agent-info">
                  <span className="agent-name">{command.name}</span>
                  <span className="agent-description">{command.description}</span>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="step-actions">
        <button className="wizard-button secondary" onClick={() => setStep('agents')}>
          Back
        </button>
        <button className="wizard-button primary" onClick={() => setStep('mcp')}>
          Next
        </button>
      </div>
    </div>
  )

  const renderMcpStep = (): JSX.Element => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">Select MCP Servers</h3>
        <p className="step-description">
          Choose which MCP servers to enable for this project. These will be saved to your project
          configuration.
        </p>
      </div>

      <div className="step-content">
        <div className="agents-header">
          <span className="agents-count">
            {selectedMcpServers.size} of {mcpServers.length} selected
          </span>
          <div className="agents-actions">
            <button className="text-button" onClick={handleSelectAllMcpServers}>
              Select All
            </button>
            <span className="divider">|</span>
            <button className="text-button" onClick={handleDeselectAllMcpServers}>
              None
            </button>
          </div>
        </div>

        <div className="agents-list">
          {mcpServers.length === 0 ? (
            <div className="agents-empty">
              <p>No global MCP servers configured.</p>
              <p className="hint">
                Configure MCP servers in Claude Desktop to make them available here.
              </p>
            </div>
          ) : (
            mcpServers.map((server) => (
              <label key={server.name} className="agent-item">
                <input
                  type="checkbox"
                  checked={selectedMcpServers.has(server.name)}
                  onChange={() => handleToggleMcpServer(server.name)}
                />
                <div className="agent-info">
                  <span className="agent-name">{server.name}</span>
                  <span className="agent-description">{server.command}</span>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="step-actions">
        <button className="wizard-button secondary" onClick={() => setStep('commands')}>
          Back
        </button>
        <button className="wizard-button primary" onClick={() => setStep('confirm')}>
          Next
        </button>
      </div>
    </div>
  )

  const renderConfirmStep = (): JSX.Element => (
    <div className="wizard-step">
      <div className="step-header">
        <h3 className="step-title">Confirm Project Setup</h3>
        <p className="step-description">Review your project configuration before creating.</p>
      </div>

      <div className="step-content">
        <div className="confirm-section">
          <h4 className="confirm-label">Project Location</h4>
          <div className="confirm-value">
            <span className="folder-icon"><FolderOpen size={ICON_SIZE.lg} /></span>
            <div>
              <strong>{projectName}</strong>
              <span className="path">{projectPath}</span>
            </div>
          </div>
        </div>

        <div className="confirm-section">
          <h4 className="confirm-label">Files to Create</h4>
          <ul className="files-list">
            <li>
              <code>.ace/project.aceproj</code> - Project configuration
            </li>
            <li>
              <code>.claude/agents/</code> - Local agents directory
            </li>
            <li>
              <code>.claude/commands/</code> - Local commands directory
            </li>
            {selectedAgents.size > 0 && (
              <li>
                {selectedAgents.size} agent file{selectedAgents.size !== 1 ? 's' : ''} copied
              </li>
            )}
            {selectedCommands.size > 0 && (
              <li>
                {selectedCommands.size} command file{selectedCommands.size !== 1 ? 's' : ''} copied
              </li>
            )}
          </ul>
        </div>

        {selectedAgents.size > 0 && (
          <div className="confirm-section">
            <h4 className="confirm-label">Agents to Import ({selectedAgents.size})</h4>
            <div className="selected-agents">
              {availableAgents
                .filter((a) => selectedAgents.has(a.id))
                .map((agent) => (
                  <span key={agent.id} className="agent-tag">
                    {agent.agent.name}
                  </span>
                ))}
            </div>
          </div>
        )}

        {selectedCommands.size > 0 && (
          <div className="confirm-section">
            <h4 className="confirm-label">Commands to Import ({selectedCommands.size})</h4>
            <div className="selected-agents">
              {availableCommands
                .filter((c) => selectedCommands.has(c.id))
                .map((command) => (
                  <span key={command.id} className="agent-tag">
                    {command.name}
                  </span>
                ))}
            </div>
          </div>
        )}

        {selectedMcpServers.size > 0 && (
          <div className="confirm-section">
            <h4 className="confirm-label">MCP Servers to Add ({selectedMcpServers.size})</h4>
            <div className="selected-agents">
              {mcpServers
                .filter((s) => selectedMcpServers.has(s.name))
                .map((server) => (
                  <span key={server.name} className="agent-tag">
                    {server.name}
                  </span>
                ))}
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="step-actions">
        <button
          className="wizard-button secondary"
          onClick={() => setStep('mcp')}
          disabled={isCreating}
        >
          Back
        </button>
        <button className="wizard-button primary" onClick={handleCreate} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        <div className="wizard-header">
          <h2 className="wizard-title">New Project</h2>
          <button className="close-button" onClick={onCancel} title="Cancel">
            <X size={ICON_SIZE.md} />
          </button>
        </div>

        <div className="wizard-steps">
          <div className={`step-indicator ${step === 'folder' ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Folder</span>
          </div>
          <div className="step-line" />
          <div className={`step-indicator ${step === 'agents' ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Agents</span>
          </div>
          <div className="step-line" />
          <div className={`step-indicator ${step === 'commands' ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Commands</span>
          </div>
          <div className="step-line" />
          <div className={`step-indicator ${step === 'mcp' ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">MCP</span>
          </div>
          <div className="step-line" />
          <div className={`step-indicator ${step === 'confirm' ? 'active' : ''}`}>
            <span className="step-number">5</span>
            <span className="step-label">Confirm</span>
          </div>
        </div>

        <div className="wizard-body">
          {step === 'folder' && renderFolderStep()}
          {step === 'agents' && renderAgentsStep()}
          {step === 'commands' && renderCommandsStep()}
          {step === 'mcp' && renderMcpStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>
      </div>
    </div>
  )
}

export default NewProjectWizard
