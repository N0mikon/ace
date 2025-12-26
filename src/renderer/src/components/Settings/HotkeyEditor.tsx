import { useState, useEffect, useCallback, useRef } from 'react'
import type { HotkeyBinding, Agent, AppActionInfo } from '../../api/types'
import { api } from '../../api'
import './HotkeyEditor.css'

interface HotkeyEditorProps {
  onClose?: () => void
}

type ActionType = 'command' | 'agent' | 'app'

interface NewHotkeyState {
  actionType: ActionType
  commandText: string
  selectedAgentId: string
  selectedAppAction: string
  accelerator: string
}

export function HotkeyEditor({ onClose: _onClose }: HotkeyEditorProps): JSX.Element {
  const [bindings, setBindings] = useState<HotkeyBinding[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [appActions, setAppActions] = useState<AppActionInfo[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHotkey, setNewHotkey] = useState<NewHotkeyState>({
    actionType: 'command',
    commandText: '',
    selectedAgentId: '',
    selectedAppAction: '',
    accelerator: ''
  })
  const [recording, setRecording] = useState<string | null>(null)
  const [recordingNew, setRecordingNew] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    const [hotkeyBindings, agentList, actions] = await Promise.all([
      api.hotkeys.list(),
      api.agents.list(),
      api.hotkeys.getAppActions()
    ])
    setBindings(hotkeyBindings || [])
    setAgents(agentList || [])
    setAppActions(actions || [])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, hotkeyId?: string) => {
      e.preventDefault()
      e.stopPropagation()

      // Build accelerator string from key event
      const parts: string[] = []

      if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      // Get the key
      let key = e.key

      // Map special keys
      const keyMap: Record<string, string> = {
        ' ': 'Space',
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        Escape: 'Esc',
        Enter: 'Return'
      }

      if (keyMap[key]) {
        key = keyMap[key]
      } else if (key.length === 1) {
        key = key.toUpperCase()
      } else if (key.startsWith('F') && !isNaN(parseInt(key.slice(1)))) {
        // F1-F12 keys - keep as is
      } else if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        // Modifier key alone - don't save yet
        return
      }

      // Skip if no modifier (except for F-keys)
      if (parts.length === 0 && !key.startsWith('F')) {
        if (hotkeyId) {
          setErrors({ ...errors, [hotkeyId]: 'Must include a modifier key (Ctrl, Alt, Shift)' })
        } else {
          setErrors({ ...errors, new: 'Must include a modifier key (Ctrl, Alt, Shift)' })
        }
        return
      }

      parts.push(key)
      const accelerator = parts.join('+')

      if (hotkeyId) {
        // Updating existing hotkey
        updateHotkey(hotkeyId, accelerator)
      } else {
        // Setting accelerator for new hotkey
        setNewHotkey(prev => ({ ...prev, accelerator }))
        setRecordingNew(false)
        setErrors(prev => {
          const next = { ...prev }
          delete next.new
          return next
        })
      }
    },
    [errors]
  )

  const updateHotkey = async (id: string, accelerator: string): Promise<void> => {
    const result = await api.hotkeys.update(id, accelerator)

    if (result?.success) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setRecording(null)
      loadData()
    } else {
      setErrors(prev => ({
        ...prev,
        [id]: result?.error || 'Failed to update hotkey'
      }))
    }
  }

  const handleRemove = async (id: string): Promise<void> => {
    await api.hotkeys.remove(id)
    loadData()
  }

  const handleClearAll = async (): Promise<void> => {
    if (confirm('Remove all hotkey bindings?')) {
      await api.hotkeys.clearAll()
      setErrors({})
      loadData()
    }
  }

  const startRecording = (id: string): void => {
    setRecording(id)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const stopRecording = (): void => {
    setRecording(null)
  }

  const startRecordingNew = (): void => {
    setRecordingNew(true)
    setTimeout(() => {
      newInputRef.current?.focus()
    }, 0)
  }

  const stopRecordingNew = (): void => {
    setRecordingNew(false)
  }

  const handleAddHotkey = async (): Promise<void> => {
    if (!newHotkey.accelerator) {
      setErrors({ ...errors, new: 'Please set a key combination' })
      return
    }

    let action: { type: string; command?: string; agentId?: string; appAction?: string }
    let description: string

    switch (newHotkey.actionType) {
      case 'command':
        if (!newHotkey.commandText.trim()) {
          setErrors({ ...errors, new: 'Please enter a command' })
          return
        }
        action = { type: 'command', command: newHotkey.commandText.trim() + '\r' }
        description = `Send: ${newHotkey.commandText.trim()}`
        break
      case 'agent':
        if (!newHotkey.selectedAgentId) {
          setErrors({ ...errors, new: 'Please select an agent' })
          return
        }
        const agent = agents.find(a => a.id === newHotkey.selectedAgentId)
        action = { type: 'agent', agentId: newHotkey.selectedAgentId }
        description = `Agent: ${agent?.agent.name || newHotkey.selectedAgentId}`
        break
      case 'app':
        if (!newHotkey.selectedAppAction) {
          setErrors({ ...errors, new: 'Please select an action' })
          return
        }
        const appAction = appActions.find(a => a.id === newHotkey.selectedAppAction)
        action = { type: 'app', appAction: newHotkey.selectedAppAction }
        description = appAction?.description || newHotkey.selectedAppAction
        break
      default:
        return
    }

    const result = await api.hotkeys.add(newHotkey.accelerator, action, description)

    if (result?.success) {
      setNewHotkey({
        actionType: 'command',
        commandText: '',
        selectedAgentId: '',
        selectedAppAction: '',
        accelerator: ''
      })
      setShowAddForm(false)
      setErrors(prev => {
        const next = { ...prev }
        delete next.new
        return next
      })
      loadData()
    } else {
      setErrors({ ...errors, new: result?.error || 'Failed to add hotkey' })
    }
  }

  const getActionTypeLabel = (type: string): string => {
    switch (type) {
      case 'command': return 'Command'
      case 'agent': return 'Agent'
      case 'app': return 'App'
      default: return type
    }
  }

  const renderHotkeyItem = (binding: HotkeyBinding): JSX.Element => {
    const isRecordingThis = recording === binding.id
    const hasError = errors[binding.id]

    return (
      <div key={binding.id} className="hotkey-item">
        <div className="hotkey-info">
          <span className="hotkey-type-badge">{getActionTypeLabel(binding.action.type)}</span>
          <span className="hotkey-description">{binding.description}</span>
        </div>
        <div className="hotkey-input-wrapper">
          <input
            ref={isRecordingThis ? inputRef : undefined}
            type="text"
            className={`hotkey-input ${isRecordingThis ? 'recording' : ''} ${hasError ? 'error' : ''}`}
            value={isRecordingThis ? 'Press keys...' : binding.accelerator}
            readOnly
            onClick={() => startRecording(binding.id)}
            onKeyDown={(e) => handleKeyDown(e, binding.id)}
            onBlur={stopRecording}
          />
          <button
            className="hotkey-remove-button"
            onClick={() => handleRemove(binding.id)}
            title="Remove hotkey"
          >
            &times;
          </button>
        </div>
        {hasError && <span className="hotkey-error">{hasError}</span>}
      </div>
    )
  }

  return (
    <div className="hotkey-editor">
      <div className="hotkey-header">
        <span className="hotkey-title">Keyboard Shortcuts</span>
        <div className="hotkey-header-actions">
          <button className="add-hotkey-button" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Hotkey'}
          </button>
          {bindings.length > 0 && (
            <button className="clear-all-button" onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="add-hotkey-form">
          <div className="form-row">
            <label>Action Type</label>
            <select
              value={newHotkey.actionType}
              onChange={(e) => setNewHotkey({ ...newHotkey, actionType: e.target.value as ActionType })}
            >
              <option value="command">Command (send text to terminal)</option>
              <option value="agent">Agent (invoke an agent)</option>
              <option value="app">App Action (toggle panels, etc.)</option>
            </select>
          </div>

          {newHotkey.actionType === 'command' && (
            <div className="form-row">
              <label>Command Text</label>
              <input
                type="text"
                value={newHotkey.commandText}
                onChange={(e) => setNewHotkey({ ...newHotkey, commandText: e.target.value })}
                placeholder="e.g., /compact or any text..."
              />
            </div>
          )}

          {newHotkey.actionType === 'agent' && (
            <div className="form-row">
              <label>Select Agent</label>
              <select
                value={newHotkey.selectedAgentId}
                onChange={(e) => setNewHotkey({ ...newHotkey, selectedAgentId: e.target.value })}
              >
                <option value="">Choose an agent...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {newHotkey.actionType === 'app' && (
            <div className="form-row">
              <label>Select Action</label>
              <select
                value={newHotkey.selectedAppAction}
                onChange={(e) => setNewHotkey({ ...newHotkey, selectedAppAction: e.target.value })}
              >
                <option value="">Choose an action...</option>
                {appActions.map(action => (
                  <option key={action.id} value={action.id}>
                    {action.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <label>Key Combination</label>
            <input
              ref={newInputRef}
              type="text"
              className={`hotkey-input ${recordingNew ? 'recording' : ''} ${errors.new ? 'error' : ''}`}
              value={recordingNew ? 'Press keys...' : newHotkey.accelerator || 'Click to set...'}
              readOnly
              onClick={startRecordingNew}
              onKeyDown={(e) => handleKeyDown(e)}
              onBlur={stopRecordingNew}
            />
          </div>

          {errors.new && <div className="form-error">{errors.new}</div>}

          <div className="form-actions">
            <button className="form-button cancel" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button className="form-button primary" onClick={handleAddHotkey}>
              Add Hotkey
            </button>
          </div>
        </div>
      )}

      {recording && (
        <div className="recording-hint">Press a key combination to set the shortcut...</div>
      )}

      {bindings.length === 0 ? (
        <div className="hotkey-empty">
          <p>No hotkeys configured.</p>
          <p className="hint">Click "+ Add Hotkey" to create keyboard shortcuts for commands, agents, or app actions.</p>
        </div>
      ) : (
        <div className="hotkey-list">
          {bindings.map(renderHotkeyItem)}
        </div>
      )}
    </div>
  )
}

export default HotkeyEditor
