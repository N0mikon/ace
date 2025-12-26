import { useState, useEffect, useRef } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  showDontAskAgain?: boolean
  onConfirm: (dontAskAgain: boolean) => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  showDontAskAgain = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element | null {
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setDontAskAgain(false)
      setTimeout(() => confirmBtnRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleConfirm = (): void => {
    onConfirm(dontAskAgain)
  }

  if (!isOpen) return null

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>

        {showDontAskAgain && (
          <label className="confirm-dialog-checkbox">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
            />
            <span>Don&apos;t ask again</span>
          </label>
        )}

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn-confirm"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
