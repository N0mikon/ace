import * as fs from 'fs'
import * as path from 'path'
import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { projectConfigManager, AceProjectConfig, LaunchConfig } from './config'
import { agentManager } from '../config/agents'
import { mcpConfigManager } from '../config/mcp'
import { sessionLogger } from '../storage'

export interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

export interface LaunchOptions {
  bypassMode: boolean
  resume: boolean
  verbose: boolean
  printMode: boolean
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
    return projectConfigManager.hasConfig(projectPath)
  }

  // Get the agents directory for a project (.claude/agents/)
  getProjectAgentsDir(projectPath: string): string | null {
    const agentsDir = path.join(projectPath, '.claude', 'agents')
    if (fs.existsSync(agentsDir)) {
      return agentsDir
    }
    return null
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

  // Load project config (.aceproj)
  ipcMain.handle(
    'projects:loadConfig',
    async (_, projectPath: string): Promise<AceProjectConfig | null> => {
      return projectConfigManager.load(projectPath)
    }
  )

  // Save project config (.aceproj)
  ipcMain.handle(
    'projects:saveConfig',
    async (_, projectPath: string, config: Partial<AceProjectConfig>): Promise<void> => {
      await projectConfigManager.save(projectPath, config)
    }
  )

  // Initialize ACE in a project (creates .aceproj and .ace/agents/)
  ipcMain.handle('projects:initializeAce', async (_, projectPath: string): Promise<void> => {
    await projectConfigManager.initialize(projectPath)
  })

  // Open folder dialog
  ipcMain.handle('projects:openDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    })
    return result.filePaths[0] || null
  })

  // Launch project (opens project, spawns terminal, runs claude)
  // This is handled by the renderer coordinating terminal:spawn
  ipcMain.handle(
    'projects:launch',
    async (_, projectPath: string, options: LaunchOptions): Promise<void> => {
      // Set current project
      projectManager.setCurrentProject(projectPath)

      // Update window title
      const config = await projectConfigManager.load(projectPath)
      const projectName = config?.project?.name || projectManager.getCurrentProjectName()
      mainWindow.setTitle(`ACE - ${projectName}`)

      // Set project directory for agents (loads project-specific agents)
      const agentsDir = projectManager.getProjectAgentsDir(projectPath)
      agentManager.setProjectDirectory(agentsDir)

      // Set project path for MCP (loads project-specific MCP servers)
      await mcpConfigManager.setProjectPath(projectPath)

      // Set project path for session logger (for log saving)
      sessionLogger.setProjectPath(projectPath)

      // The renderer will handle terminal spawn with the options
      // Send event to renderer to trigger terminal spawn
      mainWindow.webContents.send('project:launched', {
        path: projectPath,
        options,
        agentsDir
      })
    }
  )

  // Initialize window title with current project
  const projectName = projectManager.getCurrentProjectName()
  mainWindow.setTitle(`ACE - ${projectName}`)
}

// Export config manager for use in other modules
export { projectConfigManager }
export type { AceProjectConfig, LaunchConfig }
