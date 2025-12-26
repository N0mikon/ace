import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import { api } from '../../api'
import { useLayoutStore } from '../../stores/layoutStore'
import '@xterm/xterm/css/xterm.css'
import './Terminal.css'

interface TerminalProps {
  onReady?: () => void
  onExit?: (info: { exitCode: number; signal?: number }) => void
}

export function Terminal({ onReady, onExit }: TerminalProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const baseFontSizeRef = useRef(14) // Base font before zoom

  // Subscribe to zoom changes
  const terminalZoom = useLayoutStore((state) => state.terminalZoom)

  // Apply zoom when it changes
  useEffect(() => {
    if (!terminalRef.current || !fitAddonRef.current) return

    const newSize = Math.round(baseFontSizeRef.current * terminalZoom)
    terminalRef.current.options.fontSize = newSize
    fitAddonRef.current.fit()

    const { cols, rows } = terminalRef.current
    api.terminal.resize(cols, rows)
  }, [terminalZoom])

  // Handle terminal resize
  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !terminalRef.current) return

    try {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      api.terminal.resize(cols, rows)
    } catch (err) {
      console.warn('Failed to resize terminal:', err)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Track if this effect instance is still active
    let isMounted = true

    // Detect mobile viewport for smaller base font
    const isMobile = window.innerWidth <= 768
    const isSmallMobile = window.innerWidth <= 480
    const baseFont = isSmallMobile ? 10 : isMobile ? 11 : 14
    baseFontSizeRef.current = baseFont

    // Apply zoom to base font
    const currentZoom = useLayoutStore.getState().terminalZoom
    const fontSize = Math.round(baseFont * currentZoom)

    // Create terminal instance with windowsMode to disable reflow
    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#6a9955',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff'
      },
      allowProposedApi: true,
      windowsMode: true // Disable reflow for Windows ConPTY - prevents line rewrapping on resize
    })

    terminalRef.current = terminal

    // Create and load addons
    const fitAddon = new FitAddon()
    const searchAddon = new SearchAddon()
    const webLinksAddon = new WebLinksAddon()

    fitAddonRef.current = fitAddon

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(searchAddon)
    terminal.loadAddon(webLinksAddon)

    // Open terminal in container
    terminal.open(container)

    // Try to load WebGL addon (may fail on some systems)
    try {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      terminal.loadAddon(webglAddon)
    } catch (err) {
      console.warn('WebGL addon not available, falling back to canvas renderer')
    }

    // Initial fit
    fitAddon.fit()

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleResize)
    })
    resizeObserver.observe(container)

    // Handle viewport resize for dynamic base font adjustment
    const handleViewportResize = (): void => {
      const isMobileNow = window.innerWidth <= 768
      const isSmallMobileNow = window.innerWidth <= 480
      const newBaseFont = isSmallMobileNow ? 10 : isMobileNow ? 11 : 14

      if (baseFontSizeRef.current !== newBaseFont) {
        baseFontSizeRef.current = newBaseFont
        const currentZoom = useLayoutStore.getState().terminalZoom
        terminal.options.fontSize = Math.round(newBaseFont * currentZoom)
        fitAddon.fit()
        const { cols, rows } = terminal
        api.terminal.resize(cols, rows)
      }
    }

    // Handle zoom keyboard shortcuts (Ctrl+Plus/Minus/Zero)
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          useLayoutStore.getState().zoomIn()
        } else if (e.key === '-') {
          e.preventDefault()
          useLayoutStore.getState().zoomOut()
        } else if (e.key === '0') {
          e.preventDefault()
          useLayoutStore.getState().resetZoom()
        }
      }
    }

    window.addEventListener('resize', handleViewportResize)
    window.addEventListener('orientationchange', handleViewportResize)
    container.addEventListener('keydown', handleKeyDown)

    // Handle user input - send to PTY
    terminal.onData((data: string) => {
      api.terminal.write(data)
    })

    // Listen for PTY data
    const cleanupData = api.terminal.onData((data: string) => {
      if (isMounted) {
        terminal.write(data)
      }
    })

    // Listen for PTY exit
    const cleanupExit = api.terminal.onExit((info) => {
      if (isMounted) {
        terminal.writeln(`\r\n[Process exited with code ${info.exitCode}]`)
        onExit?.(info)
      }
    })

    // Spawn the terminal (check if already running first)
    const initTerminal = async (): Promise<void> => {
      if (!isMounted) return

      // Check if PTY is already running
      const status = await api.terminal.isRunning()
      if (status?.running) {
        onReady?.()
        return
      }

      const { cols, rows } = terminal
      const result = await api.terminal.spawn({ cols, rows })
      if (isMounted) {
        if (result?.success) {
          onReady?.()
        } else {
          terminal.writeln('[Failed to spawn terminal process]')
        }
      }
    }

    initTerminal()

    // Focus terminal
    terminal.focus()

    // Cleanup - dispose xterm UI only, PTY lifecycle managed by main process
    return () => {
      isMounted = false
      cleanupData()
      cleanupExit()
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleViewportResize)
      window.removeEventListener('orientationchange', handleViewportResize)
      container.removeEventListener('keydown', handleKeyDown)
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [handleResize, onReady, onExit])

  return <div ref={containerRef} className="terminal-container" />
}

export default Terminal
