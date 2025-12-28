import { useState, useEffect, useRef } from 'react'
import { api } from '../../api'
import { FileText, ICON_SIZE } from '../common/icons'
import './AgentEditor.css'

interface AgentEditorProps {
  isOpen: boolean
  agentId: string
  agentName: string
  onClose: () => void
  onSaved?: () => void
}

export function AgentEditor({
  isOpen,
  agentId,
  agentName,
  onClose,
  onSaved
}: AgentEditorProps): JSX.Element | null {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [filePath, setFilePath] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && agentId) {
      loadContent()
    }
  }, [isOpen, agentId])

  useEffect(() => {
    setHasChanges(content !== originalContent)
  }, [content, originalContent])

  const loadContent = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const result = await api.agents.readFile(agentId)
      if (result?.success && result.content) {
        setContent(result.content)
        setOriginalContent(result.content)
        setFilePath(result.filePath || '')
      } else {
        setError(result?.error || 'Failed to load file')
      }
    } catch (err) {
      setError(`Error loading file: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)

    try {
      const result = await api.agents.saveFile(agentId, content)
      if (result?.success) {
        setOriginalContent(content)
        setHasChanges(false)
        onSaved?.()
        onClose()
      } else {
        setError(result?.error || 'Failed to save file')
      }
    } catch (err) {
      setError(`Error saving file: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = (): void => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      handleClose()
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (hasChanges && !saving) {
        handleSave()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="agent-editor-overlay" onClick={handleClose}>
      <div className="agent-editor" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="agent-editor-header">
          <div className="agent-editor-title">
            <span className="agent-editor-icon"><FileText size={ICON_SIZE.md} /></span>
            <span>Edit Agent: {agentName}</span>
            {hasChanges && <span className="agent-editor-modified">*</span>}
          </div>
          <div className="agent-editor-path" title={filePath}>
            {filePath}
          </div>
        </div>

        <div className="agent-editor-content">
          {loading ? (
            <div className="agent-editor-loading">Loading...</div>
          ) : (
            <textarea
              ref={textareaRef}
              className="agent-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              autoFocus
            />
          )}
        </div>

        {error && (
          <div className="agent-editor-error">
            <span className="agent-editor-error-icon">!</span>
            {error}
          </div>
        )}

        <div className="agent-editor-footer">
          <div className="agent-editor-hint">
            Ctrl+S to save, Esc to close
          </div>
          <div className="agent-editor-actions">
            <button
              type="button"
              className="agent-editor-btn agent-editor-btn-cancel"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="agent-editor-btn agent-editor-btn-save"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentEditor
