import { useState, useEffect, useRef } from 'react'
import { api } from '../../api'
import { CommandIcons, COMMAND_ICON_OPTIONS, ICON_SIZE } from './icons'
import './FormDialog.css'

interface CreateCommandDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateCommandDialog({
  isOpen,
  onClose,
  onCreated
}: CreateCommandDialogProps): JSX.Element | null {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('zap')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setName('')
      setCommand('')
      setDescription('')
      setIcon('zap')
      setIsSubmitting(false)
      // Focus name input
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || !command.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Get current quickCommands from config
      const currentCommands = await api.config.getValue<Array<{
        name: string
        command: string
        icon?: string
        description?: string
      }>>('quickCommands') || []

      // Add new command
      const newCommand = {
        name: name.trim(),
        command: command.trim(),
        icon,
        description: description.trim() || undefined
      }

      // Save to config
      await api.config.set('quickCommands', [...currentCommands, newCommand])

      onCreated()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const isValid = name.trim() && command.trim()

  if (!isOpen) return null

  return (
    <div className="form-dialog-overlay" onClick={onClose}>
      <div className="form-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="form-dialog-header">
          <span className="form-dialog-icon">
            {(() => {
              const HeaderIcon = CommandIcons[icon] || CommandIcons.zap
              return <HeaderIcon size={ICON_SIZE.lg} />
            })()}
          </span>
          <h3 className="form-dialog-title">Create Quick Command</h3>
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
                  placeholder="e.g., Run Tests"
                  maxLength={30}
                />
              </div>
            </div>

            <div className="form-dialog-field">
              <label className="form-dialog-label">Command *</label>
              <input
                type="text"
                className="form-dialog-input monospace"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., npm test"
              />
              <span className="form-dialog-hint">
                The text to inject into the terminal. Use / prefix for Claude commands.
              </span>
            </div>

            <div className="form-dialog-field">
              <label className="form-dialog-label">Description</label>
              <input
                type="text"
                className="form-dialog-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this command do?"
                maxLength={80}
              />
            </div>

            <div className="form-dialog-field">
              <label className="form-dialog-label">Icon</label>
              <div className="icon-picker">
                {COMMAND_ICON_OPTIONS.map((opt) => {
                  const IconComponent = CommandIcons[opt.value]
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
              {isSubmitting ? 'Creating...' : 'Create Command'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCommandDialog
