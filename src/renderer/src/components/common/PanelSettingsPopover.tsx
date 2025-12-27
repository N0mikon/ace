/**
 * Panel Settings Popover
 * Provides font size slider for individual panels
 */

import { useState, useRef, useEffect } from 'react'
import { useLayoutStore } from '../../stores/layoutStore'
import './PanelSettingsPopover.css'

interface PanelSettingsPopoverProps {
  panelId: string
  onClose?: () => void
}

export function PanelSettingsPopover({ panelId, onClose }: PanelSettingsPopoverProps): JSX.Element {
  const { setPanelFontSize, getPanelSettings } = useLayoutStore()
  const settings = getPanelSettings(panelId)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value)
    setPanelFontSize(panelId, value)
  }

  const resetFontSize = (): void => {
    setPanelFontSize(panelId, 1.0)
  }

  return (
    <div className="panel-settings-popover" ref={popoverRef}>
      <div className="popover-header">
        <span className="popover-title">Panel Settings</span>
        <button className="popover-close" onClick={onClose} title="Close">
          ×
        </button>
      </div>
      <div className="popover-content">
        <div className="setting-row">
          <label className="setting-label">
            Font Size
            <span className="setting-value">{Math.round(settings.fontSize * 100)}%</span>
          </label>
          <div className="slider-row">
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={settings.fontSize}
              onChange={handleFontSizeChange}
              className="font-size-slider"
            />
            <button
              className="reset-btn"
              onClick={resetFontSize}
              title="Reset to 100%"
              disabled={settings.fontSize === 1.0}
            >
              ↺
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PanelSettingsButtonProps {
  panelId: string
}

export function PanelSettingsButton({ panelId }: PanelSettingsButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="panel-settings-container">
      <button
        className="panel-settings-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Font size settings"
      >
        Aa
      </button>
      {isOpen && (
        <PanelSettingsPopover panelId={panelId} onClose={() => setIsOpen(false)} />
      )}
    </div>
  )
}

export default PanelSettingsButton
