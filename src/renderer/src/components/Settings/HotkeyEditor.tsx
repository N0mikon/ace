import { useState, useEffect, useCallback, useRef } from 'react'
import type { HotkeyBinding } from '../../../../preload/index.d'
import './HotkeyEditor.css'

interface HotkeyEditorProps {
  onClose?: () => void
}

interface HotkeyState {
  bindings: HotkeyBinding[]
  defaults: Record<string, string>
  descriptions: Record<string, string>
  custom: Record<string, string>
}

export function HotkeyEditor({ onClose: _onClose }: HotkeyEditorProps): JSX.Element {
  const [state, setState] = useState<HotkeyState>({
    bindings: [],
    defaults: {},
    descriptions: {},
    custom: {}
  })
  const [recording, setRecording] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const loadHotkeys = useCallback(async () => {
    const [bindings, defaults, descriptions, custom] = await Promise.all([
      window.hotkeys?.list(),
      window.hotkeys?.getDefaults(),
      window.hotkeys?.getDescriptions(),
      window.hotkeys?.getCustom()
    ])

    setState({
      bindings: bindings || [],
      defaults: defaults || {},
      descriptions: descriptions || {},
      custom: custom || {}
    })
  }, [])

  useEffect(() => {
    loadHotkeys()
  }, [loadHotkeys])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, hotkeyId: string) => {
      e.preventDefault()
      e.stopPropagation()

      if (!recording) return

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
        // F1-F12 keys
      } else if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        // Modifier key alone - don't save yet
        return
      }

      // Skip if no modifier (except for F-keys)
      if (parts.length === 0 && !key.startsWith('F')) {
        setErrors({ ...errors, [hotkeyId]: 'Must include a modifier key (Ctrl, Alt, Shift)' })
        return
      }

      parts.push(key)
      const accelerator = parts.join('+')

      // Validate and save
      updateHotkey(hotkeyId, accelerator)
    },
    [recording, errors]
  )

  const updateHotkey = async (id: string, accelerator: string): Promise<void> => {
    const result = await window.hotkeys?.update(id, accelerator)

    if (result?.success) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setRecording(null)
      loadHotkeys()
    } else {
      setErrors((prev) => ({
        ...prev,
        [id]: result?.error || 'Failed to update hotkey'
      }))
    }
  }

  const handleReset = async (id: string): Promise<void> => {
    await window.hotkeys?.reset(id)
    setErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    loadHotkeys()
  }

  const handleResetAll = async (): Promise<void> => {
    if (confirm('Reset all hotkeys to their defaults?')) {
      await window.hotkeys?.resetAll()
      setErrors({})
      loadHotkeys()
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

  const isModified = (id: string): boolean => {
    return state.custom[id] !== undefined
  }

  // Group hotkeys by category
  const commandHotkeys = state.bindings.filter((b) =>
    ['exit', 'compact', 'clear', 'help'].includes(b.id)
  )
  const appHotkeys = state.bindings.filter((b) =>
    ['toggleSidebar', 'focusTerminal', 'openSettings', 'newSession', 'exportSession'].includes(b.id)
  )
  const agentHotkeys = state.bindings.filter((b) => b.id.startsWith('agent'))

  const renderHotkeyItem = (binding: HotkeyBinding): JSX.Element => {
    const isRecordingThis = recording === binding.id
    const hasError = errors[binding.id]
    const modified = isModified(binding.id)

    return (
      <div key={binding.id} className="hotkey-item">
        <span className="hotkey-description">{binding.description}</span>
        <div className="hotkey-input-wrapper">
          <input
            ref={isRecordingThis ? inputRef : undefined}
            type="text"
            className={`hotkey-input ${isRecordingThis ? 'recording' : ''} ${hasError ? 'error' : ''} ${modified ? 'modified' : ''}`}
            value={isRecordingThis ? 'Press keys...' : binding.accelerator}
            readOnly
            onClick={() => startRecording(binding.id)}
            onKeyDown={(e) => handleKeyDown(e, binding.id)}
            onBlur={stopRecording}
          />
          <button
            className="hotkey-reset-button"
            onClick={() => handleReset(binding.id)}
            disabled={!modified}
            title="Reset to default"
          >
            Reset
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
        <button className="reset-all-button" onClick={handleResetAll}>
          Reset All
        </button>
      </div>

      {recording && (
        <div className="recording-hint">Press a key combination to set the shortcut...</div>
      )}

      <div className="hotkey-section">
        <span className="section-title">Commands</span>
        <div className="hotkey-list">{commandHotkeys.map(renderHotkeyItem)}</div>
      </div>

      <div className="hotkey-section">
        <span className="section-title">Application</span>
        <div className="hotkey-list">{appHotkeys.map(renderHotkeyItem)}</div>
      </div>

      <div className="hotkey-section">
        <span className="section-title">Agents</span>
        <div className="hotkey-list">{agentHotkeys.map(renderHotkeyItem)}</div>
      </div>
    </div>
  )
}

export default HotkeyEditor
