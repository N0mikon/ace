/**
 * Layout Manager Component
 * Main layout using react-resizable-panels for configurable panel positions
 */

import { useState, useCallback, useEffect, useRef } from 'react'
// Using simple CSS flexbox instead of react-resizable-panels
import { useLayoutStore } from '../../stores/layoutStore'
import { api } from '../../api'
import { PanelArea } from './PanelArea'
import { Terminal } from '../Terminal'
import { StatusBar } from '../StatusBar'
import { SettingsModal } from '../Settings'
import type { HotkeyTriggerData, Agent } from '../../api/types'
import './LayoutManager.css'

export function LayoutManager(): JSX.Element {
  const [isReady, setIsReady] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const agentsRef = useRef<Agent[]>([])

  const {
    panels,
    areaSizes,
    collapsedAreas,
    activeTabByArea,
    terminalZoom,
    toggleAreaCollapsed,
    isMobileLayout,
    isBrowserMode,
    currentProjectPath,
    applyMobileLayout,
    loadFromProject,
    saveToProject
  } = useLayoutStore()

  // Helper to get panels in a specific area
  const getPanelsInArea = (position: 'top' | 'left' | 'right' | 'bottom'): string[] => {
    return Object.entries(panels)
      .filter(([_, config]) => config.position === position)
      .map(([id]) => id)
  }

  // Check which areas have panels
  const hasTopPanels = getPanelsInArea('top').length > 0
  const hasLeftPanels = getPanelsInArea('left').length > 0
  const hasRightPanels = getPanelsInArea('right').length > 0
  const hasBottomPanels = getPanelsInArea('bottom').length > 0

  // Load agents for hotkey support
  useEffect(() => {
    const loadAgents = async (): Promise<void> => {
      const agents = await api.agents.list()
      agentsRef.current = agents || []
    }
    loadAgents()

    const unsubscribe = api.agents.onChanged(() => {
      loadAgents()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle viewport resize for mobile detection
  useEffect(() => {
    const handleResize = (): void => {
      const isMobile = window.innerWidth <= 768

      if (isMobile && !isMobileLayout) {
        console.log('Switching to mobile layout')
        applyMobileLayout()
      } else if (!isMobile && isMobileLayout && currentProjectPath) {
        console.log('Switching back to desktop layout, reloading from project')
        // Reload project layout when leaving mobile
        loadFromProject(currentProjectPath)
      }
    }

    // Check on mount
    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [isMobileLayout, currentProjectPath, applyMobileLayout, loadFromProject])

  // Debounced auto-save when layout changes (including zoom)
  useEffect(() => {
    if (!currentProjectPath || isMobileLayout) return

    const timer = setTimeout(() => {
      saveToProject()
    }, 1000) // Debounce 1 second

    return () => clearTimeout(timer)
  }, [panels, areaSizes, collapsedAreas, activeTabByArea, terminalZoom, currentProjectPath, isMobileLayout, saveToProject])

  // Handle hotkey triggers from main process
  useEffect(() => {
    const unsubscribe = api.hotkeys.onTriggered((data: HotkeyTriggerData) => {
      console.log('Hotkey triggered:', data)

      switch (data.action.type) {
        case 'command':
          if (data.action.command) {
            api.terminal.write(data.action.command)
          }
          break

        case 'app':
          switch (data.action.action) {
            case 'toggleLeftPanel':
              toggleAreaCollapsed('left')
              break
            case 'toggleRightPanel':
              toggleAreaCollapsed('right')
              break
            case 'toggleTopPanel':
              toggleAreaCollapsed('top')
              break
            case 'toggleBottomPanel':
              toggleAreaCollapsed('bottom')
              break
            case 'focusTerminal':
              // Focus is handled by Terminal component
              break
            case 'openSettings':
              setIsSettingsOpen(true)
              break
            case 'newSession':
              api.terminal.kill().then(() => {
                api.terminal.spawn()
              })
              break
            case 'exportSession':
              api.session.current().then((result) => {
                if (result?.sessionId) {
                  api.session.export(result.sessionId)
                }
              })
              break
          }
          break

        case 'agent':
          if (data.action.agentId) {
            const index = parseInt(data.action.agentId) - 1
            const agent = agentsRef.current[index]
            if (agent) {
              api.terminal.write(agent.prompt.text)
              setTimeout(() => {
                api.terminal.write('\r')
              }, 50)
            }
          }
          break
      }
    })

    return () => {
      unsubscribe()
    }
  }, [toggleAreaCollapsed])

  const handleTerminalReady = useCallback((): void => {
    setIsReady(true)
    console.log('Terminal ready')
  }, [])

  const handleTerminalExit = useCallback(
    (info: { exitCode: number; signal?: number }): void => {
      console.log('Terminal exited:', info)
    },
    []
  )

  const handleCloseSettings = useCallback((): void => {
    setIsSettingsOpen(false)
  }, [])

  // Determine which areas are visible (have panels and not collapsed)
  const showTop = hasTopPanels && !collapsedAreas.top
  const showLeft = hasLeftPanels && !collapsedAreas.left
  const showRight = hasRightPanels && !collapsedAreas.right
  const showBottom = hasBottomPanels && !collapsedAreas.bottom

  return (
    <div
      className={`layout-manager ${isMobileLayout ? 'mobile-layout' : ''}`}
      data-mobile={isMobileLayout}
      data-browser={isBrowserMode}
    >
      {/* Top Panel Area */}
      {showTop && (
        <div className="layout-panel layout-panel-top">
          <PanelArea position="top" />
        </div>
      )}

      <div className="layout-content">
        {/* Left Panel Area */}
        {showLeft && (
          <div className="layout-panel layout-panel-left">
            <PanelArea position="left" />
          </div>
        )}

        {/* Terminal (Center - always visible) */}
        <div className="layout-terminal">
          <Terminal onReady={handleTerminalReady} onExit={handleTerminalExit} />
        </div>

        {/* Right Panel Area */}
        {showRight && (
          <div className="layout-panel layout-panel-right">
            <PanelArea position="right" />
          </div>
        )}
      </div>

      {/* Bottom Panel Area */}
      {showBottom && (
        <div className="layout-panel layout-panel-bottom">
          <PanelArea position="bottom" />
        </div>
      )}

      <StatusBar
        terminalReady={isReady}
        sidebarCollapsed={!showLeft && !showRight}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {!isReady && (
        <div className="loading-overlay">
          <span>
            <div className="loading-spinner" />
            Starting terminal...
          </span>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </div>
  )
}

export default LayoutManager
