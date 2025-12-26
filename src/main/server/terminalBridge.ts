/**
 * Terminal Bridge
 * Bridges PTY events to WebSocket clients
 */

import { clientManager } from './clientManager'
import { mainPty } from '../terminal/pty'
import type { ServerEvent } from './protocol'

let isInitialized = false

// Initialize terminal bridge - connect PTY events to WebSocket broadcast
export function initTerminalBridge(): void {
  if (isInitialized) return
  isInitialized = true

  // Broadcast terminal data to all WebSocket clients
  mainPty.onData((data: string) => {
    const event: ServerEvent = {
      type: 'event',
      channel: 'terminal:data',
      data
    }
    clientManager.broadcast(event)
  })

  // Broadcast terminal exit to all WebSocket clients
  mainPty.onExit((info: { exitCode: number; signal?: number }) => {
    const event: ServerEvent = {
      type: 'event',
      channel: 'terminal:exit',
      data: info
    }
    clientManager.broadcast(event)
  })

  console.log('[Terminal Bridge] Initialized - PTY events will broadcast to WebSocket clients')
}

// Dispose terminal bridge
export function disposeTerminalBridge(): void {
  // Note: The PTY event listeners are managed by node-pty internally
  // We just mark as not initialized so it can be re-initialized if needed
  isInitialized = false
}
