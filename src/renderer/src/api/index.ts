/**
 * API Factory
 * Detects whether running in Electron or browser mode and returns the appropriate API implementation.
 *
 * Usage:
 *   import { api } from './api'
 *   api.terminal.write('hello')
 */

import type { ACEAPI } from './types'
import { ipcApi } from './ipcApi'

// Detect if we're running in Electron
// In Electron, window.process exists and has type 'renderer'
// In browser, window.process is undefined
const isElectron = (): boolean => {
  // Check if window exists (for SSR safety)
  if (typeof window === 'undefined') {
    return false
  }

  // Check for Electron-specific APIs
  // The preload script exposes window.terminal, window.config, etc.
  // which only exist in Electron context
  return !!(
    window.terminal &&
    window.config &&
    window.agents
  )
}

// Lazy-loaded WebSocket API (only imported in browser mode)
let wsApiPromise: Promise<ACEAPI> | null = null

const getWsApi = async (): Promise<ACEAPI> => {
  if (!wsApiPromise) {
    wsApiPromise = import('./wsApi').then(m => m.wsApi)
  }
  return wsApiPromise
}

// API instance - initialized based on environment
let apiInstance: ACEAPI | null = null
let apiInitPromise: Promise<ACEAPI> | null = null

/**
 * Initialize the API
 * In Electron mode, returns immediately with IPC API
 * In browser mode, connects to WebSocket server first
 */
export const initApi = async (): Promise<ACEAPI> => {
  if (apiInstance) {
    return apiInstance
  }

  if (apiInitPromise) {
    return apiInitPromise
  }

  apiInitPromise = (async () => {
    if (isElectron()) {
      console.log('ACE: Running in Electron mode')
      apiInstance = ipcApi
    } else {
      console.log('ACE: Running in browser mode, connecting to WebSocket...')
      const wsApi = await getWsApi()
      apiInstance = wsApi
    }
    return apiInstance
  })()

  return apiInitPromise
}

/**
 * Get the API instance synchronously
 * Only works after initApi() has completed
 * In Electron mode, this works immediately
 */
export const getApi = (): ACEAPI => {
  if (!apiInstance) {
    // In Electron mode, we can initialize synchronously
    if (isElectron()) {
      apiInstance = ipcApi
      return apiInstance
    }
    throw new Error('API not initialized. Call initApi() first in browser mode.')
  }
  return apiInstance
}

/**
 * Check if API is ready
 */
export const isApiReady = (): boolean => {
  return apiInstance !== null
}

/**
 * Check if running in Electron mode
 */
export const isElectronMode = (): boolean => {
  return isElectron()
}

// For convenience in Electron mode where we know APIs are available,
// export a proxy that lazily initializes
// This allows components to import { api } and use it directly
export const api: ACEAPI = new Proxy({} as ACEAPI, {
  get(_target, prop: keyof ACEAPI) {
    const instance = getApi()
    return instance[prop]
  }
})

// Re-export types
export * from './types'
