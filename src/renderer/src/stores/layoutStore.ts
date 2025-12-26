/**
 * Layout Store for ACE
 * Manages configurable panel positions using Zustand with persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PanelPosition = 'top' | 'left' | 'bottom' | 'right' | 'hidden'

export interface PanelConfig {
  position: PanelPosition
  order: number
}

export interface AreaSizes {
  top: number
  left: number
  bottom: number
  right: number
}

export interface LayoutState {
  panels: Record<string, PanelConfig>
  areaSizes: AreaSizes
  collapsedAreas: Record<string, boolean>
  activeTabByArea: Record<string, string>

  // Actions
  setPanelPosition: (panelId: string, position: PanelPosition) => void
  setAreaSize: (area: keyof AreaSizes, size: number) => void
  toggleAreaCollapsed: (area: string) => void
  setActiveTab: (area: string, panelId: string) => void
  resetLayout: () => void
  getPanelsInArea: (position: PanelPosition) => string[]
}

const DEFAULT_PANELS: Record<string, PanelConfig> = {
  agents: { position: 'left', order: 0 },
  commands: { position: 'left', order: 1 },
  mcp: { position: 'left', order: 2 }
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
  right: 'mcp',
  bottom: '',
  top: ''
}

// Helper to ensure panels have valid defaults
const ensureValidPanels = (panels: Record<string, PanelConfig> | undefined): Record<string, PanelConfig> => {
  if (!panels || Object.keys(panels).length === 0) {
    console.log('Panels empty, using defaults')
    return { ...DEFAULT_PANELS }
  }
  return panels
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      panels: { ...DEFAULT_PANELS },
      areaSizes: { ...DEFAULT_AREA_SIZES },
      collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
      activeTabByArea: { ...DEFAULT_ACTIVE_TABS },

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

      setActiveTab: (area, panelId) =>
        set((state) => ({
          activeTabByArea: { ...state.activeTabByArea, [area]: panelId }
        })),

      resetLayout: () =>
        set({
          panels: { ...DEFAULT_PANELS },
          areaSizes: { ...DEFAULT_AREA_SIZES },
          collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
          activeTabByArea: { ...DEFAULT_ACTIVE_TABS }
        }),

      getPanelsInArea: (position) => {
        const { panels } = get()
        return Object.entries(panels)
          .filter(([_, config]) => config.position === position)
          .sort((a, b) => a[1].order - b[1].order)
          .map(([id]) => id)
      }
    }),
    {
      name: 'ace-layout',
      version: 6,
      migrate: (_persistedState: unknown, version: number) => {
        console.log('Migrating layout store from version:', version)
        // Always reset to defaults on migration
        return {
          panels: { ...DEFAULT_PANELS },
          areaSizes: { ...DEFAULT_AREA_SIZES },
          collapsedAreas: { ...DEFAULT_COLLAPSED_AREAS },
          activeTabByArea: { ...DEFAULT_ACTIVE_TABS }
        }
      },
      onRehydrateStorage: () => (state) => {
        // Fix panels if they're empty after rehydration
        if (state) {
          const validPanels = ensureValidPanels(state.panels)
          if (validPanels !== state.panels) {
            useLayoutStore.setState({ panels: validPanels })
          }
          console.log('Layout store rehydrated:', state.panels)
        }
      }
    }
  )
)
