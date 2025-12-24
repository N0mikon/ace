/**
 * Project Launcher
 * Full-screen launcher shown on startup for project selection
 */

import { useEffect, useState } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { RecentProjects } from './RecentProjects'
import { LaunchOptions } from './LaunchOptions'
import { NewProjectWizard } from './NewProjectWizard'
import './ProjectLauncher.css'

export function ProjectLauncher(): JSX.Element {
  const {
    recentProjects,
    currentProject,
    launchOptions,
    isLoading,
    setProject,
    setLaunchOptions,
    launch,
    loadRecentProjects,
    openFolder
  } = useProjectStore()

  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    loadRecentProjects()
  }, [loadRecentProjects])

  const handleNewProject = (): void => {
    setShowWizard(true)
  }

  const handleWizardComplete = async (projectPath: string): Promise<void> => {
    setShowWizard(false)

    // Load the newly created project
    const config = await window.projects.loadConfig(projectPath)
    const projectName = config?.project?.name || projectPath.split(/[/\\]/).pop() || 'Project'

    setProject({
      name: projectName,
      path: projectPath,
      lastOpened: new Date().toISOString(),
      hasAceConfig: true
    })

    // Reload recent projects list
    loadRecentProjects()
  }

  const handleWizardCancel = (): void => {
    setShowWizard(false)
  }

  const handleSelectRecent = async (project: {
    name: string
    path: string
    lastOpened: string
  }): Promise<void> => {
    // Load config to check if it exists
    const config = await window.projects.loadConfig(project.path)

    setProject({
      ...project,
      hasAceConfig: !!config
    })

    // Load saved launch options
    if (config?.launch) {
      setLaunchOptions({
        bypassMode: config.launch.bypass_mode ?? false,
        resume: config.launch.resume ?? true,
        verbose: config.launch.verbose ?? false,
        printMode: config.launch.print_mode ?? false
      })
    }
  }

  return (
    <div className="project-launcher">
      <div className="launcher-container">
        <header className="launcher-header">
          <h1 className="launcher-title">ACE</h1>
          <p className="launcher-subtitle">AI Command Environment</p>
        </header>

        <main className="launcher-content">
          <section className="launcher-section">
            <h2 className="section-title">Recent Projects</h2>
            <RecentProjects
              projects={recentProjects}
              selectedPath={currentProject?.path}
              onSelect={handleSelectRecent}
            />
          </section>

          <div className="launcher-actions">
            <button className="action-button" onClick={handleNewProject}>
              <span className="action-icon">+</span>
              <span>New Project</span>
            </button>
            <button className="action-button" onClick={openFolder}>
              <span className="action-icon">📁</span>
              <span>Open Folder...</span>
            </button>
          </div>

          {currentProject && (
            <>
              <section className="launcher-section">
                <h2 className="section-title">Launch Options</h2>
                <LaunchOptions options={launchOptions} onChange={setLaunchOptions} />
              </section>

              <div className="launcher-launch">
                <div className="selected-project">
                  <span className="selected-label">Selected:</span>
                  <span className="selected-name">{currentProject.name}</span>
                  <span className="selected-path">{currentProject.path}</span>
                </div>
                <button
                  className="launch-button"
                  onClick={launch}
                  disabled={isLoading}
                >
                  {isLoading ? 'Launching...' : 'Launch'}
                  {!isLoading && <span className="launch-icon">▶</span>}
                </button>
              </div>
            </>
          )}
        </main>

        <footer className="launcher-footer">
          <p>v0.1.0</p>
        </footer>
      </div>

      {showWizard && (
        <NewProjectWizard onComplete={handleWizardComplete} onCancel={handleWizardCancel} />
      )}
    </div>
  )
}

export default ProjectLauncher
