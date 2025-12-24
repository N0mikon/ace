/**
 * Recent Projects List
 * Displays list of recently opened projects
 */

interface RecentProject {
  name: string
  path: string
  lastOpened: string
}

interface RecentProjectsProps {
  projects: RecentProject[]
  selectedPath?: string
  onSelect: (project: RecentProject) => void
}

function formatLastOpened(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString()
}

export function RecentProjects({
  projects,
  selectedPath,
  onSelect
}: RecentProjectsProps): JSX.Element {
  if (projects.length === 0) {
    return (
      <div className="recent-projects empty">
        <p className="empty-message">No recent projects</p>
        <p className="empty-hint">Open a folder or create a new project to get started</p>
      </div>
    )
  }

  return (
    <div className="recent-projects">
      {projects.map((project) => (
        <button
          key={project.path}
          className={`project-item ${selectedPath === project.path ? 'selected' : ''}`}
          onClick={() => onSelect(project)}
        >
          <span className="project-icon">📁</span>
          <div className="project-info">
            <span className="project-name">{project.name}</span>
            <span className="project-path">{project.path}</span>
          </div>
          <span className="project-time">{formatLastOpened(project.lastOpened)}</span>
        </button>
      ))}
    </div>
  )
}

export default RecentProjects
