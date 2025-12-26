import { useEffect } from 'react'
import { LayoutManager } from './components/Layout'
import { ProjectLauncher } from './components/ProjectLauncher'
import { useProjectStore } from './stores/projectStore'
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

        api.terminal.write(cmd + '\r')
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
