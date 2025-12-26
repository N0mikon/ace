/**
 * Browser Entry Point
 * Initializes WebSocket connection and renders the app for browser mode.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../src/App'
import '../src/assets/main.css'
import { initializeWsApi, getWsSyncedProject } from '../src/api/wsApi'
import { initApi } from '../src/api'
import { useProjectStore } from '../src/stores/projectStore'

// Set browser mode flag before anything else
;(window as unknown as { __ACE_BROWSER_MODE__: boolean }).__ACE_BROWSER_MODE__ = true

async function init(): Promise<void> {
  const loadingScreen = document.getElementById('loading-screen')
  const loadingError = document.getElementById('loading-error')

  try {
    // Initialize WebSocket connection first
    await initializeWsApi()

    // Then initialize the API factory so components can use it
    await initApi()

    // Check if a project is already running on the server
    const syncedProject = getWsSyncedProject()
    if (syncedProject) {
      console.log('Browser: Syncing to already-running project:', syncedProject)
      // Set the project store to show the main UI instead of launcher
      useProjectStore.setState({
        currentProject: {
          name: syncedProject.name,
          path: syncedProject.path,
          lastOpened: new Date().toISOString(),
          hasAceConfig: true
        },
        isLaunched: true
      })
    }

    // Hide loading screen
    if (loadingScreen) {
      loadingScreen.classList.add('hidden')
    }

    // Render the app
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize browser mode:', error)

    // Show error on loading screen
    if (loadingError) {
      loadingError.textContent = error instanceof Error
        ? `Connection failed: ${error.message}`
        : 'Failed to connect to ACE server. Is it running?'
    }

    // Add retry button
    if (loadingScreen) {
      const retryBtn = document.createElement('button')
      retryBtn.textContent = 'Retry Connection'
      retryBtn.style.cssText = `
        margin-top: 16px;
        padding: 8px 16px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `
      retryBtn.onclick = () => {
        if (loadingError) loadingError.textContent = ''
        retryBtn.remove()
        init()
      }
      loadingScreen.appendChild(retryBtn)
    }
  }
}

// Start initialization
init()
