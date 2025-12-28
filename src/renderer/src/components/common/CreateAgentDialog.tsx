import { useState, useEffect, useRef } from 'react'
import { api } from '../../api'
import { AgentIcons, AGENT_ICON_OPTIONS, ICON_SIZE } from './icons'
import './FormDialog.css'

interface CreateAgentDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateAgentDialog({
  isOpen,
  onClose,
  onCreated
}: CreateAgentDialogProps): JSX.Element | null {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [icon, setIcon] = useState('default')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setName('')
      setDescription('')
      setPrompt('')
      setIcon('default')
      setIsSubmitting(false)
      // Focus name input
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await api.agents.create(
        name.trim(),
        description.trim(),
        prompt.trim()
      )
      if (result?.success) {
        onCreated()
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const isValid = name.trim() && prompt.trim()

  if (!isOpen) return null

  return (
    <div className="form-dialog-overlay" onClick={onClose}>
      <div className="form-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="form-dialog-header">
          <span className="form-dialog-icon">
            {(() => {
              const HeaderIcon = AgentIcons[icon] || AgentIcons.default
              return <HeaderIcon size={ICON_SIZE.lg} />
            })()}
          </span>
          <h3 className="form-dialog-title">Create New Agent</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-dialog-content">
            <div className="form-dialog-row">
              <div className="form-dialog-field">
                <label className="form-dialog-label">Name *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  className="form-dialog-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Code Reviewer"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="form-dialog-field">
              <label className="form-dialog-label">Description</label>
              <input
                type="text"
                className="form-dialog-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this agent does..."
                maxLength={100}
              />
            </div>

            <div className="form-dialog-field">
              <label className="form-dialog-label">Icon</label>
              <div className="icon-picker">
                {AGENT_ICON_OPTIONS.map((opt) => {
                  const IconComponent = AgentIcons[opt.value]
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`icon-option ${icon === opt.value ? 'selected' : ''}`}
                      onClick={() => setIcon(opt.value)}
                      title={opt.label}
                    >
                      <IconComponent size={ICON_SIZE.lg} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-dialog-field">
              <label className="form-dialog-label">Prompt *</label>
              <textarea
                className="form-dialog-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter the agent's system prompt..."
                rows={5}
              />
              <span className="form-dialog-hint">
                This prompt will be injected when you click the agent.
              </span>
            </div>
          </div>

          <div className="form-dialog-actions">
            <button
              type="button"
              className="form-dialog-btn form-dialog-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="form-dialog-btn form-dialog-btn-confirm"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAgentDialog
