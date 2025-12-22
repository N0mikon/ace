import { useState, useCallback, useEffect, useRef } from 'react'
import { Terminal } from './components/Terminal'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { SettingsModal } from './components/Settings'
import type { HotkeyTriggerData, Agent } from '../../preload/index.d'

function App(): JSX.Element {
  const [isReady, setIsReady] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const terminalRef = useRef<{ focus: () => void } | null>(null)
  const agentsRef = useRef<Agent[]>([])

  // Load agents for hotkey support
  useEffect(() => {
    const loadAgents = async (): Promise<void> => {
      const agents = await window.agents?.list()
      agentsRef.current = agents || []
    }
    loadAgents()

    // Listen for agent changes
    const unsubscribe = window.agents?.onChanged(() => {
      loadAgents()
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Handle hotkey triggers from main process
  useEffect(() => {
    const unsubscribe = window.hotkeys?.onTriggered((data: HotkeyTriggerData) => {
      console.log('Hotkey triggered:', data)

      switch (data.action.type) {
        case 'command':
          if (data.action.command) {
            window.terminal?.write(data.action.command)
          }
          break

        case 'app':
          switch (data.action.action) {
            case 'toggleSidebar':
              setSidebarCollapsed((prev) => !prev)
              break
            case 'focusTerminal':
              terminalRef.current?.focus()
              break
            case 'openSettings':
              setIsSettingsOpen(true)
              break
            case 'newSession':
              // Kill and restart terminal
              window.terminal?.kill().then(() => {
                window.terminal?.spawn()
              })
              break
            case 'exportSession':
              window.session?.current().then((result) => {
                if (result?.sessionId) {
                  window.session?.export(result.sessionId)
                }
              })
              break
          }
          break

        case 'agent':
          // Agent hotkeys use index (1-9)
          if (data.action.agentId) {
            const index = parseInt(data.action.agentId) - 1
            const agent = agentsRef.current[index]
            if (agent) {
              window.terminal?.write(agent.prompt.text + '\n')
            }
          }
          break
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const handleTerminalReady = (): void => {
    setIsReady(true)
    console.log('Terminal ready')
  }

  const handleTerminalExit = (info: { exitCode: number; signal?: number }): void => {
    console.log('Terminal exited:', info)
  }

  const handleCommand = useCallback((command: string): void => {
    // Send command to terminal via preload API
    window.terminal?.write(command)
    console.log('Command sent:', command.trim())
  }, [])

  const handleOpenSettings = useCallback((): void => {
    setIsSettingsOpen(true)
  }, [])

  const handleCloseSettings = useCallback((): void => {
    setIsSettingsOpen(false)
  }, [])

  const handleToggleSidebar = useCallback((): void => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  return (
    <div className="app">
      <div className="app-main">
        <div className="terminal-wrapper">
          <Terminal onReady={handleTerminalReady} onExit={handleTerminalExit} />
          <button
            className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
            onClick={handleToggleSidebar}
            title={sidebarCollapsed ? 'Show sidebar (Ctrl+B)' : 'Hide sidebar (Ctrl+B)'}
          >
            <span className="toggle-icon">{sidebarCollapsed ? '\u25C0' : '\u25B6'}</span>
          </button>
        </div>
        <Sidebar
          onCommand={handleCommand}
          onOpenSettings={handleOpenSettings}
          collapsed={sidebarCollapsed}
        />
      </div>
      <StatusBar terminalReady={isReady} sidebarCollapsed={sidebarCollapsed} />
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

export default App
