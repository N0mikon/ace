import * as fs from 'fs'
import * as path from 'path'
import * as toml from '@iarna/toml'
import { app } from 'electron'

// Adapter interfaces
export interface AdapterInfo {
  name: string
  version?: string
  description?: string
  launchCommand: string
  detectPattern?: string
}

export interface AdapterCommands {
  [key: string]: string
}

export interface AdapterFlags {
  [key: string]: string
}

export interface AdapterPatterns {
  [key: string]: string
}

export interface AdapterShortcuts {
  [key: string]: string
}

export interface ToolAdapter {
  id: string
  filePath: string
  adapter: AdapterInfo
  commands: AdapterCommands
  flags: AdapterFlags
  patterns: AdapterPatterns
  shortcuts: AdapterShortcuts
}

// Raw TOML structure
interface RawAdapterToml {
  adapter?: {
    name?: string
    version?: string
    description?: string
    launch_command?: string
    detect_pattern?: string
  }
  commands?: Record<string, string>
  flags?: Record<string, string>
  patterns?: Record<string, string>
  shortcuts?: Record<string, string>
}

class AdapterManager {
  private adapters: Map<string, ToolAdapter> = new Map()
  private adaptersDir: string
  private activeAdapterId: string = 'claude-code'

  constructor() {
    // Default adapters directory is in the app resources
    this.adaptersDir = path.join(app.getAppPath(), 'adapters')
  }

  async initialize(): Promise<void> {
    await this.loadAdapters()
  }

  async loadAdapters(): Promise<void> {
    this.adapters.clear()

    // Check if adapters directory exists
    if (!fs.existsSync(this.adaptersDir)) {
      console.log('Adapters directory not found:', this.adaptersDir)
      // Try development path
      const devPath = path.join(process.cwd(), 'adapters')
      if (fs.existsSync(devPath)) {
        this.adaptersDir = devPath
      } else {
        return
      }
    }

    const files = fs.readdirSync(this.adaptersDir)
    const tomlFiles = files.filter((f) => f.endsWith('.toml'))

    for (const file of tomlFiles) {
      try {
        const filePath = path.join(this.adaptersDir, file)
        const adapter = await this.parseAdapterFile(filePath)
        if (adapter) {
          this.adapters.set(adapter.id, adapter)
        }
      } catch (error) {
        console.error(`Failed to load adapter ${file}:`, error)
      }
    }

    console.log(`Loaded ${this.adapters.size} tool adapter(s)`)
  }

  private async parseAdapterFile(filePath: string): Promise<ToolAdapter | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = toml.parse(content) as unknown as RawAdapterToml

      if (!parsed.adapter?.name || !parsed.adapter?.launch_command) {
        console.warn(`Invalid adapter file (missing required fields): ${filePath}`)
        return null
      }

      const id = path.basename(filePath, '.toml')

      return {
        id,
        filePath,
        adapter: {
          name: parsed.adapter.name,
          version: parsed.adapter.version,
          description: parsed.adapter.description,
          launchCommand: parsed.adapter.launch_command,
          detectPattern: parsed.adapter.detect_pattern
        },
        commands: parsed.commands || {},
        flags: parsed.flags || {},
        patterns: parsed.patterns || {},
        shortcuts: parsed.shortcuts || {}
      }
    } catch (error) {
      console.error(`Failed to parse adapter file ${filePath}:`, error)
      return null
    }
  }

  getAdapters(): ToolAdapter[] {
    return Array.from(this.adapters.values())
  }

  getAdapter(id: string): ToolAdapter | undefined {
    return this.adapters.get(id)
  }

  getActiveAdapter(): ToolAdapter | undefined {
    return this.adapters.get(this.activeAdapterId)
  }

  setActiveAdapter(id: string): boolean {
    if (this.adapters.has(id)) {
      this.activeAdapterId = id
      return true
    }
    return false
  }

  getActiveAdapterId(): string {
    return this.activeAdapterId
  }

  // Get command string for the active adapter
  getCommand(commandName: string): string | undefined {
    const adapter = this.getActiveAdapter()
    return adapter?.commands[commandName]
  }

  // Get flag string for the active adapter
  getFlag(flagName: string): string | undefined {
    const adapter = this.getActiveAdapter()
    return adapter?.flags[flagName]
  }

  // Get launch command for the active adapter
  getLaunchCommand(): string {
    const adapter = this.getActiveAdapter()
    return adapter?.adapter.launchCommand || 'claude'
  }

  // Get launch command with flags
  getLaunchCommandWithFlags(flags: string[] = []): string {
    const adapter = this.getActiveAdapter()
    if (!adapter) return 'claude'

    const flagStrings = flags
      .map((f) => adapter.flags[f])
      .filter((f) => f !== undefined)

    return [adapter.adapter.launchCommand, ...flagStrings].join(' ')
  }
}

// Singleton instance
export const adapterManager = new AdapterManager()
