import { useEffect } from 'react'
import { LayoutManager } from './components/Layout'
import { ProjectLauncher } from './components/ProjectLauncher'
import { useProjectStore } from './stores/projectStore'
import { useLayoutStore } from './stores/layoutStore'
import { api } from './api'

// Apply theme to document
const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.setAttribute('data-theme', theme)
}

function App(): JSX.Element {
  const { isLaunched } = useProjectStore()

  // Load and apply theme from config
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const theme = await api.config.getValue<'light' | 'dark'>('general.theme')
        applyTheme(theme || 'light')
      } catch (err) {
        console.error('Failed to load theme:', err)
        applyTheme('light') // Default to light
      }
    }
    loadTheme()
  }, [])

  // Listen for layout changes from other clients (real-time sync)
  useEffect(() => {
    const unsubscribe = api.layout.onChanged(({ projectPath, layout }) => {
      const { currentProjectPath, isMobileLayout, applyLayoutConfig } = useLayoutStore.getState()

      // Only apply if it's for our current project and we're not in mobile layout
      if (projectPath === currentProjectPath && !isMobileLayout) {
        console.log('Received layout change from another client:', layout)
        applyLayoutConfig(layout)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // Listen for project launched event from main process
    const unsubscribe = api.projects.onLaunched(async (data) => {
      const { path, options, agentsDir } = data

      // Spawn terminal with project context
      await api.terminal.spawn({
        cwd: path
      })

      // Wait a moment for shell to be ready, then send claude command
      setTimeout(() => {
        let cmd = 'claude'
        if (options.resume) cmd += ' --resume'
        if (options.bypassMode) cmd += ' --dangerously-skip-permissions'
        if (options.verbose) cmd += ' --verbose'
        if (options.printMode) cmd += ' --print'

        api.terminal.write(cmd)
        setTimeout(() => {
          api.terminal.write('\r')
        }, 50)
      }, 500)

      // TODO: Notify agent manager about project agents directory
      console.log('Project agents dir:', agentsDir)
    })

    return () => unsubscribe()
  }, [])

  if (!isLaunched) {
    return <ProjectLauncher />
  }

  return <LayoutManager />
}

export default App
