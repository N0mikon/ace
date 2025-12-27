/**
 * Layout Store for ACE
 * Manages configurable panel positions using Zustand
 * Stores layout per-project in .aceproj config files
 */

import { create } from 'zustand'
import { api } from '../api'
import type { LayoutConfig, PanelConfig, AreaSizes, PanelPosition, PanelSettings } from '../api/types'

export type { PanelPosition, PanelConfig, AreaSizes, LayoutConfig, PanelSettings }

export interface LayoutState {
  panels: Record<string, PanelConfig>
  areaSizes: AreaSizes
  collapsedAreas: Record<string, boolean>
  activeTabByArea: Record<string, string>
  panelSettings: Record<string, PanelSettings>
  terminalZoom: number // 0.5 to 2.0, default 1.0
  isMobileLayout: boolean
  isBrowserMode: boolean
  currentProjectPath: string | null

  // Actions
  setPanelPosition: (panelId: string, position: PanelPosition) => void
  setAreaSize: (area: keyof AreaSizes, size: number) => void
  toggleAreaCollapsed: (area: string) => void
  setActiveTab: (area: string, panelId: string) => void
  resetLayout: () => void
  getPanelsInArea: (position: PanelPosition) => string[]
  setMobileLayout: (isMobile: boolean) => void
  setBrowserMode: (isBrowser: boolean) => void

  // Panel settings actions
  setPanelFontSize: (panelId: string, fontSize: number) => void
  setPanelPreferredSize: (panelId: string, preferredSize: number) => void
  getPanelSettings: (panelId: string) => PanelSettings

  // Terminal zoom actions
  setTerminalZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void

  // Project-based storage
  loadFromProject: (projectPath: string) => Promise<void>
  saveToProject: () => Promise<void>
  applyMobileLayout: () => void
  applyLayoutConfig: (layout: LayoutConfig) => void
}

// NEW DEFAULT LAYOUT: MCP top, Agents left, Commands right, Skills right, Plugins bottom
const DEFAULT_PANELS: Record<string, PanelConfig> = {
  agents: { position: 'left', order: 0 },
  commands: { position: 'right', order: 0 },
  mcp: { position: 'top', order: 0 },
  skills: { position: 'right', order: 1 },
  plugins: { position: 'bottom', order: 0 }
}

const DEFAULT_AREA_SIZES: AreaSizes = {
  top: 20,
  left: 25,
  bottom: 25,
  right: 20
}

const DEFAULT_COLLAPSED_AREAS: Record<string, boolean> = {
  top: false,
  left: false,
  bottom: false,
  right: false
}

const DEFAULT_ACTIVE_TABS: Record<string, string> = {
  left: 'agents',
  right: 'commands',
  bottom: 'plugins',
  top: 'mcp'
}

const DEFAULT_PANEL_SETTINGS: Record<string, PanelSettings> = {
  agents: { fontSize: 1.0, preferredSize: 25 },
  commands: { fontSize: 1.0, preferredSize: 20 },
  mcp: { fontSize: 1.0, preferredSize: 20 },
  skills: { fontSize: 1.0, preferredSize: 20 },
  plugins: { fontSize: 1.0, preferredSize: 25 }
}

// Mobile layout - all panels move to top
const MOBILE_PANELS: Record<string, PanelConfig> = {
  agents: { position: 'top', order: 0 },
  commands: { position: 'top', order: 1 },
  mcp: { position: 'top', order: 2 },
  skills: { position: 'top', order: 3 },
  plugins: { position: 'top', order: 4 }
}

const MOBILE_AREA_SIZES: AreaSizes = {
  top: 35,
  left: 0,
  bottom: 0,
  right: 0
}

const MOBILE_COLLAPSED_AREAS: Record<string, boolean> = {
  top: false,
  left: true,
  bottom: true,
  right: true
}

const MOBILE_ACTIVE_TABS: Record<string, string> = {
  top: 'agents',
  left: '',
  bottom: '',
  right: ''
}

export const useLayoutStore = create<LayoutState>()((set, get) => ({
  panels: { ...DEFAULT_PANELS },
  areaSizes: { ...DEFAULT_AREA_SIZES },
  collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
  activeTabByArea: { ...DEFAULT_ACTIVE_TABS },
  panelSettings: { ...DEFAULT_PANEL_SETTINGS },
  terminalZoom: 1.0,
  isMobileLayout: false,
  isBrowserMode: false,
  currentProjectPath: null,

  setPanelPosition: (panelId, position) =>
    set((state) => ({
      panels: {
        ...state.panels,
        [panelId]: { ...state.panels[panelId], position }
      }
    })),

  setAreaSize: (area, size) =>
    set((state) => ({
      areaSizes: { ...state.areaSizes, [area]: size }
    })),

  toggleAreaCollapsed: (area) =>
    set((state) => ({
      collapsedAreas: {
        ...state.collapsedAreas,
        [area]: !state.collapsedAreas[area]
      }
    })),

  setActiveTab: (area, panelId) => {
    const { panelSettings } = get()
    const settings = panelSettings[panelId] || DEFAULT_PANEL_SETTINGS[panelId] || { fontSize: 1.0, preferredSize: 20 }

    // Apply the panel's preferred size to the area when switching tabs
    set((state) => ({
      activeTabByArea: { ...state.activeTabByArea, [area]: panelId },
      areaSizes: { ...state.areaSizes, [area]: settings.preferredSize }
    }))
  },

  resetLayout: () =>
    set({
      panels: { ...DEFAULT_PANELS },
      areaSizes: { ...DEFAULT_AREA_SIZES },
      collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
      activeTabByArea: { ...DEFAULT_ACTIVE_TABS },
      panelSettings: { ...DEFAULT_PANEL_SETTINGS },
      terminalZoom: 1.0,
      isMobileLayout: false
    }),

  getPanelsInArea: (position) => {
    const { panels } = get()
    return Object.entries(panels)
      .filter(([, config]) => config.position === position)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id]) => id)
  },

  setMobileLayout: (isMobile) => set({ isMobileLayout: isMobile }),

  setBrowserMode: (isBrowser) => set({ isBrowserMode: isBrowser }),

  // Panel settings actions
  setPanelFontSize: (panelId: string, fontSize: number) => {
    const clamped = Math.max(0.7, Math.min(1.5, fontSize))
    set((state) => ({
      panelSettings: {
        ...state.panelSettings,
        [panelId]: {
          ...(state.panelSettings[panelId] || DEFAULT_PANEL_SETTINGS[panelId] || { fontSize: 1.0, preferredSize: 20 }),
          fontSize: clamped
        }
      }
    }))
  },

  setPanelPreferredSize: (panelId: string, preferredSize: number) => {
    const clamped = Math.max(10, Math.min(50, preferredSize))
    set((state) => ({
      panelSettings: {
        ...state.panelSettings,
        [panelId]: {
          ...(state.panelSettings[panelId] || DEFAULT_PANEL_SETTINGS[panelId] || { fontSize: 1.0, preferredSize: 20 }),
          preferredSize: clamped
        }
      }
    }))
  },

  getPanelSettings: (panelId: string): PanelSettings => {
    const { panelSettings } = get()
    return panelSettings[panelId] || DEFAULT_PANEL_SETTINGS[panelId] || { fontSize: 1.0, preferredSize: 20 }
  },

  // Terminal zoom actions
  setTerminalZoom: (zoom: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, zoom))
    set({ terminalZoom: clamped })
  },

  zoomIn: () => {
    const current = get().terminalZoom
    get().setTerminalZoom(current + 0.1)
  },

  zoomOut: () => {
    const current = get().terminalZoom
    get().setTerminalZoom(current - 0.1)
  },

  resetZoom: () => set({ terminalZoom: 1.0 }),

  // Load layout from project config
  loadFromProject: async (projectPath: string) => {
    console.log('Loading layout from project:', projectPath)
    set({ currentProjectPath: projectPath })

    try {
      const layout = await api.layout.load(projectPath)
      if (layout) {
        console.log('Loaded layout from project:', layout)
        set({
          panels: layout.panels || { ...DEFAULT_PANELS },
          areaSizes: layout.areaSizes || { ...DEFAULT_AREA_SIZES },
          collapsedAreas: layout.collapsedAreas || { ...DEFAULT_COLLAPSED_AREAS },
          activeTabByArea: layout.activeTabByArea || { ...DEFAULT_ACTIVE_TABS },
          panelSettings: layout.panelSettings || { ...DEFAULT_PANEL_SETTINGS },
          terminalZoom: layout.terminalZoom ?? 1.0
        })
      } else {
        console.log('No saved layout, using defaults')
        set({
          panels: { ...DEFAULT_PANELS },
          areaSizes: { ...DEFAULT_AREA_SIZES },
          collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
          activeTabByArea: { ...DEFAULT_ACTIVE_TABS },
          panelSettings: { ...DEFAULT_PANEL_SETTINGS },
          terminalZoom: 1.0
        })
      }
    } catch (error) {
      console.error('Failed to load layout from project:', error)
      // Use defaults on error
      set({
        panels: { ...DEFAULT_PANELS },
        areaSizes: { ...DEFAULT_AREA_SIZES },
        collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
        activeTabByArea: { ...DEFAULT_ACTIVE_TABS },
        panelSettings: { ...DEFAULT_PANEL_SETTINGS },
        terminalZoom: 1.0
      })
    }

    // Apply mobile override if needed
    if (window.innerWidth <= 768) {
      get().applyMobileLayout()
    }
  },

  // Save layout to project config
  saveToProject: async () => {
    const { currentProjectPath, panels, areaSizes, collapsedAreas, activeTabByArea, panelSettings, terminalZoom, isMobileLayout } = get()

    // Don't save if no project or if in mobile layout (mobile is temporary)
    if (!currentProjectPath || isMobileLayout) {
      console.log('Skipping layout save:', !currentProjectPath ? 'no project' : 'mobile layout')
      return
    }

    try {
      await api.layout.save(currentProjectPath, {
        panels,
        areaSizes,
        collapsedAreas,
        activeTabByArea,
        panelSettings,
        terminalZoom
      })
      console.log('Layout saved to project:', currentProjectPath)
    } catch (error) {
      console.error('Failed to save layout to project:', error)
    }
  },

  // Apply mobile layout (all panels to top)
  applyMobileLayout: () => {
    console.log('Applying mobile layout')
    set({
      panels: { ...MOBILE_PANELS },
      areaSizes: { ...MOBILE_AREA_SIZES },
      collapsedAreas: { ...MOBILE_COLLAPSED_AREAS },
      activeTabByArea: { ...MOBILE_ACTIVE_TABS },
      isMobileLayout: true
    })
  },

  // Apply layout from external source (e.g., layout:changed event)
  applyLayoutConfig: (layout: LayoutConfig) => {
    const { isMobileLayout } = get()
    // Don't apply if in mobile layout
    if (isMobileLayout) {
      console.log('Ignoring layout change - mobile layout active')
      return
    }

    set({
      panels: layout.panels || { ...DEFAULT_PANELS },
      areaSizes: layout.areaSizes || { ...DEFAULT_AREA_SIZES },
      collapsedAreas: layout.collapsedAreas || { ...DEFAULT_COLLAPSED_AREAS },
      activeTabByArea: layout.activeTabByArea || { ...DEFAULT_ACTIVE_TABS },
      panelSettings: layout.panelSettings || { ...DEFAULT_PANEL_SETTINGS },
      terminalZoom: layout.terminalZoom ?? 1.0
    })
  }
}))
