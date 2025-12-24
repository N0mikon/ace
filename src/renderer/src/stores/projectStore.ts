/**
 * Project Store
 * Manages current project state, launch options, and project lifecycle
 */

import { create } from 'zustand'

export interface LaunchOptions {
  bypassMode: boolean
  resume: boolean
  verbose: boolean
  printMode: boolean
}

export interface ProjectInfo {
  name: string
  path: string
  lastOpened: string
  hasAceConfig: boolean
}

interface ProjectState {
  // State
  currentProject: ProjectInfo | null
  launchOptions: LaunchOptions
  isLaunched: boolean
  recentProjects: ProjectInfo[]
  isLoading: boolean

  // Actions
  setProject: (project: ProjectInfo | null) => void
  setLaunchOptions: (options: Partial<LaunchOptions>) => void
  launch: () => Promise<void>
  closeProject: () => void
  loadRecentProjects: () => Promise<void>
  openFolder: () => Promise<void>
  initializeProject: (path: string) => Promise<void>
}

const DEFAULT_LAUNCH_OPTIONS: LaunchOptions = {
  bypassMode: false,
  resume: true,
  verbose: false,
  printMode: false
}

// Helper to load project config - defined before store so it can be called
const loadProjectConfig = async (projectPath: string): Promise<void> => {
  try {
    const config = await window.projects.loadConfig(projectPath)
    if (config?.launch) {
      useProjectStore.setState({
        launchOptions: {
          bypassMode: config.launch.bypass_mode ?? false,
          resume: config.launch.resume ?? true,
          verbose: config.launch.verbose ?? false,
          printMode: config.launch.print_mode ?? false
        }
      })
    }
  } catch (error) {
    console.error('Failed to load project config:', error)
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  launchOptions: DEFAULT_LAUNCH_OPTIONS,
  isLaunched: false,
  recentProjects: [],
  isLoading: false,

  setProject: (project) => {
    set({ currentProject: project })
    // Load project config if it has one
    if (project?.hasAceConfig && project.path) {
      loadProjectConfig(project.path)
    }
  },

  setLaunchOptions: (options) =>
    set((state) => ({
      launchOptions: { ...state.launchOptions, ...options }
    })),

  launch: async () => {
    const { currentProject, launchOptions } = get()
    if (!currentProject) return

    set({ isLoading: true })

    try {
      // Save launch options to .aceproj
      await window.projects.saveConfig(currentProject.path, {
        launch: {
          bypass_mode: launchOptions.bypassMode,
          resume: launchOptions.resume,
          verbose: launchOptions.verbose,
          print_mode: launchOptions.printMode
        }
      })

      // Launch terminal with project context
      await window.projects.launch(currentProject.path, launchOptions)

      set({ isLaunched: true, isLoading: false })
    } catch (error) {
      console.error('Failed to launch project:', error)
      set({ isLoading: false })
    }
  },

  closeProject: () => {
    // Kill terminal if running
    window.terminal?.kill()

    set({
      currentProject: null,
      isLaunched: false,
      launchOptions: DEFAULT_LAUNCH_OPTIONS
    })
  },

  loadRecentProjects: async () => {
    try {
      const projects = await window.projects.getRecent()
      // Map to ProjectInfo with hasAceConfig check
      const projectInfos: ProjectInfo[] = await Promise.all(
        projects.map(async (p) => ({
          ...p,
          hasAceConfig: await window.projects.hasConfig(p.path)
        }))
      )
      set({ recentProjects: projectInfos })
    } catch (error) {
      console.error('Failed to load recent projects:', error)
    }
  },

  openFolder: async () => {
    try {
      const path = await window.projects.openDialog()
      if (!path) return

      // Check if project has .aceproj config
      const config = await window.projects.loadConfig(path)
      const projectName = config?.project?.name || path.split(/[/\\]/).pop() || 'Project'

      const project: ProjectInfo = {
        name: projectName,
        path,
        lastOpened: new Date().toISOString(),
        hasAceConfig: !!config
      }

      set({ currentProject: project })

      // Load saved launch options if config exists
      if (config?.launch) {
        set({
          launchOptions: {
            bypassMode: config.launch.bypass_mode ?? false,
            resume: config.launch.resume ?? true,
            verbose: config.launch.verbose ?? false,
            printMode: config.launch.print_mode ?? false
          }
        })
      }
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  },

  initializeProject: async (path: string) => {
    try {
      await window.projects.initializeAce(path)

      const projectName = path.split(/[/\\]/).pop() || 'Project'

      set({
        currentProject: {
          name: projectName,
          path,
          lastOpened: new Date().toISOString(),
          hasAceConfig: true
        },
        launchOptions: DEFAULT_LAUNCH_OPTIONS
      })
    } catch (error) {
      console.error('Failed to initialize project:', error)
    }
  }
}))
