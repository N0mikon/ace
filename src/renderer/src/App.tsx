import { useEffect } from 'react'
import { LayoutManager } from './components/Layout'
import { ProjectLauncher } from './components/ProjectLauncher'
import { useProjectStore } from './stores/projectStore'

function App(): JSX.Element {
  const { isLaunched } = useProjectStore()

  useEffect(() => {
    // Listen for project launched event from main process
    const unsubscribe = window.projects.onLaunched(async (data) => {
      const { path, options, agentsDir } = data

      // Spawn terminal with project context
      await window.terminal.spawn({
        cwd: path
      })

      // Wait a moment for shell to be ready, then send claude command
      setTimeout(() => {
        let cmd = 'claude'
        if (options.resume) cmd += ' --resume'
        if (options.bypassMode) cmd += ' --dangerously-skip-permissions'
        if (options.verbose) cmd += ' --verbose'
        if (options.printMode) cmd += ' --print'

        window.terminal.write(cmd + '\r')
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
