import * as fs from 'fs'
import * as path from 'path'
import { app, ipcMain, BrowserWindow } from 'electron'

export interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

class ProjectManager {
  private recentProjects: RecentProject[] = []
  private currentProject: string
  private dataPath: string
  private maxRecentProjects = 10

  constructor() {
    this.currentProject = process.cwd()
    this.dataPath = path.join(app.getPath('userData'), 'recent-projects.json')
  }

  init(): void {
    this.loadRecentProjects()
    // Add current project to recent
    this.addRecentProject(this.currentProject)
  }

  private loadRecentProjects(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf-8')
        this.recentProjects = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load recent projects:', error)
      this.recentProjects = []
    }
  }

  private saveRecentProjects(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.recentProjects, null, 2))
    } catch (error) {
      console.error('Failed to save recent projects:', error)
    }
  }

  addRecentProject(projectPath: string): void {
    const normalizedPath = path.normalize(projectPath)
    const name = path.basename(normalizedPath) || normalizedPath

    // Remove if already exists
    this.recentProjects = this.recentProjects.filter(
      (p) => path.normalize(p.path) !== normalizedPath
    )

    // Add to front
    this.recentProjects.unshift({
      path: normalizedPath,
      name,
      lastOpened: new Date().toISOString()
    })

    // Limit size
    if (this.recentProjects.length > this.maxRecentProjects) {
      this.recentProjects = this.recentProjects.slice(0, this.maxRecentProjects)
    }

    this.saveRecentProjects()
  }

  removeRecentProject(projectPath: string): void {
    const normalizedPath = path.normalize(projectPath)
    this.recentProjects = this.recentProjects.filter(
      (p) => path.normalize(p.path) !== normalizedPath
    )
    this.saveRecentProjects()
  }

  getRecentProjects(): RecentProject[] {
    // Filter out projects that no longer exist
    return this.recentProjects.filter((p) => {
      try {
        return fs.existsSync(p.path)
      } catch {
        return false
      }
    })
  }

  getCurrentProject(): string {
    return this.currentProject
  }

  getCurrentProjectName(): string {
    return path.basename(this.currentProject) || this.currentProject
  }

  setCurrentProject(projectPath: string): void {
    this.currentProject = path.normalize(projectPath)
    this.addRecentProject(projectPath)
  }

  clearRecentProjects(): void {
    this.recentProjects = []
    this.saveRecentProjects()
  }

  // Check if a path has an ACE project config
  hasProjectConfig(projectPath: string): boolean {
    const configPath = path.join(projectPath, 'ace.project.toml')
    return fs.existsSync(configPath)
  }
}

export const projectManager = new ProjectManager()

// Register IPC handlers for project management
export function registerProjectIPC(mainWindow: BrowserWindow): void {
  // Get recent projects
  ipcMain.handle('projects:getRecent', async (): Promise<RecentProject[]> => {
    return projectManager.getRecentProjects()
  })

  // Get current project
  ipcMain.handle('projects:getCurrent', async (): Promise<{ path: string; name: string }> => {
    return {
      path: projectManager.getCurrentProject(),
      name: projectManager.getCurrentProjectName()
    }
  })

  // Add project to recent
  ipcMain.handle('projects:addRecent', async (_, projectPath: string): Promise<void> => {
    projectManager.addRecentProject(projectPath)
  })

  // Remove project from recent
  ipcMain.handle('projects:removeRecent', async (_, projectPath: string): Promise<void> => {
    projectManager.removeRecentProject(projectPath)
  })

  // Clear recent projects
  ipcMain.handle('projects:clearRecent', async (): Promise<void> => {
    projectManager.clearRecentProjects()
  })

  // Open project (changes CWD and updates window title)
  ipcMain.handle(
    'projects:open',
    async (_, projectPath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!fs.existsSync(projectPath)) {
          return { success: false, error: 'Project path does not exist' }
        }

        projectManager.setCurrentProject(projectPath)

        // Update window title
        const projectName = projectManager.getCurrentProjectName()
        mainWindow.setTitle(`ACE - ${projectName}`)

        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // Check if path has project config
  ipcMain.handle('projects:hasConfig', async (_, projectPath: string): Promise<boolean> => {
    return projectManager.hasProjectConfig(projectPath)
  })

  // Initialize window title with current project
  const projectName = projectManager.getCurrentProjectName()
  mainWindow.setTitle(`ACE - ${projectName}`)
}
