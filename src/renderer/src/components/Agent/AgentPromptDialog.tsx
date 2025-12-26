import { useState, useEffect, useRef, useCallback } from 'react'
import type { Agent } from '../../../../preload/index.d'
import './AgentPromptDialog.css'

interface AgentPromptDialogProps {
  isOpen: boolean
  agents: Agent[]
  selectedAgent: Agent | null
  onRun: (prompt: string) => void
  onCancel: () => void
}

/**
 * Build an XML-structured prompt combining agent base prompt with user inputs
 */
function buildXmlPrompt(
  agentBasePrompt: string,
  task: string,
  context?: string,
  constraints?: string
): string {
  let prompt = agentBasePrompt.trim()

  if (prompt) {
    prompt += '\n\n'
  }

  prompt += `<task>\n${task.trim()}\n</task>`

  if (context?.trim()) {
    prompt += `\n\n<context>\n${context.trim()}\n</context>`
  }

  if (constraints?.trim()) {
    prompt += `\n\n<constraints>\n${constraints.trim()}\n</constraints>`
  }

  return prompt
}

export function AgentPromptDialog({
  isOpen,
  agents,
  selectedAgent,
  onRun,
  onCancel
}: AgentPromptDialogProps): JSX.Element | null {
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(selectedAgent)
  const [task, setTask] = useState('')
  const [context, setContext] = useState('')
  const [constraints, setConstraints] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const taskInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens with new agent
  useEffect(() => {
    if (isOpen) {
      setCurrentAgent(selectedAgent)
      setTask('')
      setContext('')
      setConstraints('')
      setShowPreview(false)
      setTimeout(() => taskInputRef.current?.focus(), 50)
    }
  }, [isOpen, selectedAgent])

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!currentAgent || !task.trim()) return

    const prompt = buildXmlPrompt(
      currentAgent.prompt.text,
      task,
      context,
      constraints
    )
    onRun(prompt)
  }

  const getPreviewPrompt = (): string => {
    if (!currentAgent) return ''
    return buildXmlPrompt(
      currentAgent.prompt.text,
      task || '[Your task here]',
      context,
      constraints
    )
  }

  if (!isOpen) return null

  return (
    <div className="agent-prompt-overlay" onClick={onCancel}>
      <div className="agent-prompt-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="agent-prompt-header">
          <h3 className="agent-prompt-title">Run Agent</h3>
          <button className="agent-prompt-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="agent-prompt-form">
          <div className="agent-prompt-field">
            <label className="agent-prompt-label">Agent</label>
            <select
              className="agent-prompt-select"
              value={currentAgent?.id || ''}
              onChange={(e) => {
                const agent = agents.find((a) => a.id === e.target.value)
                setCurrentAgent(agent || null)
              }}
            >
              <option value="">Select an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="agent-prompt-field">
            <label className="agent-prompt-label">
              Task <span className="agent-prompt-required">*</span>
            </label>
            <input
              ref={taskInputRef}
              type="text"
              className="agent-prompt-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What do you want the agent to do?"
            />
          </div>

          <div className="agent-prompt-field">
            <label className="agent-prompt-label">Context / Details</label>
            <textarea
              className="agent-prompt-textarea"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Files to focus on, relevant information, background context..."
              rows={3}
            />
          </div>

          <div className="agent-prompt-field">
            <label className="agent-prompt-label">Constraints / Avoid</label>
            <textarea
              className="agent-prompt-textarea"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Things the agent should NOT do..."
              rows={2}
            />
          </div>

          <div className="agent-prompt-preview-toggle">
            <button
              type="button"
              className="agent-prompt-preview-btn"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '▼' : '▶'} Preview XML
            </button>
          </div>

          {showPreview && (
            <div className="agent-prompt-preview">
              <pre className="agent-prompt-preview-content">{getPreviewPrompt()}</pre>
            </div>
          )}

          <div className="agent-prompt-actions">
            <button
              type="button"
              className="agent-prompt-btn agent-prompt-btn-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="agent-prompt-btn agent-prompt-btn-run"
              disabled={!currentAgent || !task.trim()}
            >
              Run Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AgentPromptDialog
