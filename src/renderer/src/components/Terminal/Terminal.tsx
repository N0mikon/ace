import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
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

  // Handle terminal resize
  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !terminalRef.current) return

    try {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      window.terminal?.resize(cols, rows)
    } catch (err) {
      console.warn('Failed to resize terminal:', err)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Track if this effect instance is still active
    let isMounted = true

    // Create terminal instance
    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
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
      allowProposedApi: true
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

    // Handle user input - send to PTY
    terminal.onData((data: string) => {
      window.terminal?.write(data)
    })

    // Listen for PTY data
    const cleanupData = window.terminal?.onData((data: string) => {
      if (isMounted) {
        terminal.write(data)
      }
    })

    // Listen for PTY exit
    const cleanupExit = window.terminal?.onExit((info) => {
      if (isMounted) {
        terminal.writeln(`\r\n[Process exited with code ${info.exitCode}]`)
        onExit?.(info)
      }
    })

    // Spawn the terminal (check if already running first)
    const initTerminal = async (): Promise<void> => {
      if (!isMounted) return

      // Check if PTY is already running
      const status = await window.terminal?.isRunning()
      if (status?.running) {
        onReady?.()
        return
      }

      const { cols, rows } = terminal
      const result = await window.terminal?.spawn({ cols, rows })
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
      cleanupData?.()
      cleanupExit?.()
      resizeObserver.disconnect()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [handleResize, onReady, onExit])

  return <div ref={containerRef} className="terminal-container" />
}

export default Terminal
