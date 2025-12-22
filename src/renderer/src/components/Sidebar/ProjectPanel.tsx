import { useState, useEffect } from 'react'
import type { RecentProject } from '../../../../preload/index.d'
import './ProjectPanel.css'

interface ProjectPanelProps {
  onProjectChange?: (projectPath: string) => void
}

export function ProjectPanel({ onProjectChange }: ProjectPanelProps): JSX.Element {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [currentProject, setCurrentProject] = useState<{ path: string; name: string } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    setIsLoading(true)
    const [recent, current] = await Promise.all([
      window.projects?.getRecent(),
      window.projects?.getCurrent()
    ])
    setRecentProjects(recent || [])
    setCurrentProject(current || null)
    setIsLoading(false)
  }

  const handleOpenProject = async (projectPath: string): Promise<void> => {
    const result = await window.projects?.open(projectPath)
    if (result?.success) {
      await loadData()
      onProjectChange?.(projectPath)
    } else {
      console.error('Failed to open project:', result?.error)
    }
  }

  const handleRemoveRecent = async (projectPath: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await window.projects?.removeRecent(projectPath)
    loadData()
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const truncatePath = (p: string, maxLen: number = 40): string => {
    if (p.length <= maxLen) return p
    const parts = p.split(/[/\\]/)
    if (parts.length <= 2) return '...' + p.slice(-maxLen + 3)

    // Show first and last parts
    const first = parts[0]
    const last = parts.slice(-2).join('/')
    return `${first}/.../${last}`
  }

  return (
    <div className="project-panel">
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-content">
          <span className="panel-title">Project</span>
          {currentProject && (
            <span className="current-project-name" title={currentProject.path}>
              {currentProject.name}
            </span>
          )}
        </div>
        <button className="expand-button" title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? '\u25BC' : '\u25B6'}
        </button>
      </div>

      {isExpanded && (
        <div className="project-content">
          {currentProject && (
            <div className="current-project">
              <div className="current-label">Current:</div>
              <div className="current-path" title={currentProject.path}>
                {truncatePath(currentProject.path)}
              </div>
            </div>
          )}

          <div className="recent-header">
            <span>Recent Projects</span>
            {recentProjects.length > 0 && (
              <button
                className="clear-button"
                onClick={async () => {
                  await window.projects?.clearRecent()
                  loadData()
                }}
                title="Clear recent"
              >
                Clear
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="project-loading">Loading...</div>
          ) : recentProjects.length === 0 ? (
            <div className="project-empty">No recent projects</div>
          ) : (
            <div className="project-list">
              {recentProjects
                .filter((p) => p.path !== currentProject?.path)
                .slice(0, 5)
                .map((project) => (
                  <div
                    key={project.path}
                    className="project-item"
                    onClick={() => handleOpenProject(project.path)}
                    title={project.path}
                  >
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <span className="project-date">{formatDate(project.lastOpened)}</span>
                    </div>
                    <button
                      className="remove-button"
                      onClick={(e) => handleRemoveRecent(project.path, e)}
                      title="Remove from recent"
                    >
                      &times;
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectPanel
