/**
 * Agent system for ACE
 * Loads, parses, and watches agent TOML files
 */

import * as fs from 'fs'
import * as path from 'path'
import * as TOML from '@iarna/toml'
import { app } from 'electron'

// Agent definition types
export interface AgentPrompt {
  text: string
}

export interface AgentOptions {
  suggestedTools?: string[]
  contextNotes?: string
}

export interface AgentDefinition {
  name: string
  description: string
  hotkey?: string
  icon?: string
}

export interface Agent {
  id: string
  filePath: string
  agent: AgentDefinition
  prompt: AgentPrompt
  options?: AgentOptions
}

export interface AgentFile {
  agent: AgentDefinition
  prompt: AgentPrompt
  options?: AgentOptions
}

// Agent manager class
class AgentManager {
  private projectAgents: Map<string, Agent> = new Map()
  private globalAgents: Map<string, Agent> = new Map()
  private defaultAgents: Map<string, Agent> = new Map()
  private globalDirectory: string = ''
  private projectDirectory: string | null = null
  private defaultAgentsDir: string | null = null
  private watchers: fs.FSWatcher[] = []
  private changeCallback: (() => void) | null = null

  /**
   * Initialize the agent manager with directories
   */
  init(globalDir?: string): void {
    // Default to %APPDATA%/ace/ace/agents
    this.globalDirectory =
      globalDir || path.join(app.getPath('appData'), 'ace', 'ace', 'agents')

    this.ensureDirectory(this.globalDirectory)

    // Find default agents directory
    this.findDefaultAgentsDir()

    // Load global agents (user's custom agents)
    this.loadGlobalAgents()

    // Load default agents from resources
    this.loadDefaultAgents()

    this.watchDirectories()
  }

  /**
   * Find the default agents directory in resources
   */
  private findDefaultAgentsDir(): void {
    const resourcePaths = [
      path.join(process.resourcesPath, 'default-agents'),
      path.join(app.getAppPath(), 'resources', 'default-agents'),
      path.join(__dirname, '..', '..', '..', 'resources', 'default-agents')
    ]

    for (const p of resourcePaths) {
      if (fs.existsSync(p)) {
        this.defaultAgentsDir = p
        break
      }
    }
  }

  /**
   * Set project-specific agents directory
   */
  setProjectDirectory(dir: string | null): void {
    this.projectDirectory = dir
    this.loadProjectAgents()
    this.watchDirectories()
  }

  /**
   * Set callback for agent changes
   */
  onAgentsChanged(callback: () => void): void {
    this.changeCallback = callback
  }

  /**
   * Get project-specific agents only (for Agent Panel)
   */
  list(): Agent[] {
    return Array.from(this.projectAgents.values())
  }

  /**
   * Get global agents (user's custom agents in appdata)
   */
  listGlobal(): Agent[] {
    return Array.from(this.globalAgents.values())
  }

  /**
   * Get default agents from resources (for wizard)
   */
  listDefaults(): Agent[] {
    return Array.from(this.defaultAgents.values())
  }

  /**
   * Get all available agents for selection (global + defaults, no duplicates)
   * Used in New Project Wizard
   */
  listAllAvailable(): Agent[] {
    const combined = new Map<string, Agent>()

    // Add defaults first
    for (const [id, agent] of this.defaultAgents) {
      combined.set(id, agent)
    }

    // Global agents override defaults with same ID
    for (const [id, agent] of this.globalAgents) {
      combined.set(id, agent)
    }

    return Array.from(combined.values())
  }

  /**
   * Get a specific agent by ID (searches project, then global, then defaults)
   */
  get(id: string): Agent | undefined {
    return this.projectAgents.get(id) || this.globalAgents.get(id) || this.defaultAgents.get(id)
  }

  /**
   * Get an agent's prompt text
   */
  getPrompt(id: string): string | undefined {
    const agent = this.get(id)
    return agent?.prompt.text
  }

  /**
   * Open an agent file in the default editor (deprecated, use editor window)
   */
  openFile(id: string): boolean {
    const agent = this.get(id)
    if (agent) {
      const { shell } = require('electron')
      shell.openPath(agent.filePath)
      return true
    }
    return false
  }

  /**
   * Read an agent file's raw content
   */
  readFile(id: string): { success: boolean; content?: string; filePath?: string; error?: string } {
    const agent = this.get(id)
    if (!agent) {
      return { success: false, error: `Agent not found: ${id}` }
    }

    try {
      const content = fs.readFileSync(agent.filePath, 'utf-8')
      return { success: true, content, filePath: agent.filePath }
    } catch (err) {
      return { success: false, error: `Failed to read file: ${err}` }
    }
  }

  /**
   * Save content to an agent file
   */
  saveFile(id: string, content: string): { success: boolean; error?: string } {
    const agent = this.get(id)
    if (!agent) {
      return { success: false, error: `Agent not found: ${id}` }
    }

    try {
      // Validate TOML before saving
      TOML.parse(content)

      fs.writeFileSync(agent.filePath, content, 'utf-8')
      this.loadAgents()
      this.changeCallback?.()
      return { success: true }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unexpected')) {
        return { success: false, error: `Invalid TOML syntax: ${err.message}` }
      }
      return { success: false, error: `Failed to save file: ${err}` }
    }
  }

  /**
   * Create a new agent file from template
   */
  createAgent(name: string, description: string, promptText: string): string | null {
    const fileName = this.sanitizeFileName(name) + '.toml'
    const filePath = path.join(this.globalDirectory, fileName)

    if (fs.existsSync(filePath)) {
      console.warn(`Agent file already exists: ${filePath}`)
      return null
    }

    const content = `# Agent: ${name}

[agent]
name = "${name}"
description = "${description}"
# hotkey = "Ctrl+1"
# icon = "default"

[prompt]
text = """
${promptText}
"""

[options]
# suggested_tools = ["web_search"]
# context_notes = ""
`

    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      this.loadAgents()
      return filePath
    } catch (err) {
      console.error('Failed to create agent file:', err)
      return null
    }
  }

  /**
   * Reload all agents from disk
   */
  reload(): void {
    this.loadAgents()
  }

  /**
   * Copy an agent to a project's .claude/agents/ directory
   * Searches in global and default agents (not project agents)
   */
  copyToProject(id: string, projectPath: string): { success: boolean; filePath?: string; error?: string } {
    // Look for agent in global or defaults (not project, since we're copying TO project)
    const agent = this.globalAgents.get(id) || this.defaultAgents.get(id)
    if (!agent) {
      return { success: false, error: `Agent not found: ${id}` }
    }

    // Target directory: .claude/agents/
    const targetDir = path.join(projectPath, '.claude', 'agents')
    this.ensureDirectory(targetDir)

    const targetPath = path.join(targetDir, path.basename(agent.filePath))

    // Check if already exists
    if (fs.existsSync(targetPath)) {
      return { success: false, error: `Agent already exists in project: ${path.basename(agent.filePath)}` }
    }

    try {
      fs.copyFileSync(agent.filePath, targetPath)
      return { success: true, filePath: targetPath }
    } catch (err) {
      return { success: false, error: `Failed to copy agent: ${err}` }
    }
  }

  /**
   * Get the global agents directory path
   */
  getGlobalDirectory(): string {
    return this.globalDirectory
  }

  /**
   * Clean up watchers
   */
  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.close()
    }
    this.watchers = []
  }

  // Private methods

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`Created agents directory: ${dir}`)
    }
  }

  /**
   * Reload all agents
   */
  private loadAgents(): void {
    this.loadGlobalAgents()
    this.loadProjectAgents()
    this.loadDefaultAgents()
  }

  /**
   * Load global agents from user's appdata directory
   */
  private loadGlobalAgents(): void {
    this.globalAgents.clear()
    this.loadAgentsIntoMap(this.globalDirectory, this.globalAgents)
    console.log(`Loaded ${this.globalAgents.size} global agents`)
  }

  /**
   * Load project-specific agents
   */
  private loadProjectAgents(): void {
    this.projectAgents.clear()
    if (this.projectDirectory && fs.existsSync(this.projectDirectory)) {
      this.loadAgentsIntoMap(this.projectDirectory, this.projectAgents)
    }
    console.log(`Loaded ${this.projectAgents.size} project agents`)
  }

  /**
   * Load default agents from resources
   */
  private loadDefaultAgents(): void {
    this.defaultAgents.clear()
    if (this.defaultAgentsDir) {
      this.loadAgentsIntoMap(this.defaultAgentsDir, this.defaultAgents)
    }
    console.log(`Loaded ${this.defaultAgents.size} default agents`)
  }

  private loadAgentsIntoMap(dir: string, targetMap: Map<string, Agent>): void {
    if (!fs.existsSync(dir)) return

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.toml'))

    for (const file of files) {
      const filePath = path.join(dir, file)
      const agent = this.parseAgentFile(filePath)
      if (agent) {
        targetMap.set(agent.id, agent)
      }
    }
  }

  private parseAgentFile(filePath: string): Agent | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = TOML.parse(content) as unknown as AgentFile

      if (!parsed.agent || !parsed.prompt) {
        console.warn(`Invalid agent file (missing agent or prompt): ${filePath}`)
        return null
      }

      // Generate ID from filename
      const id = path.basename(filePath, '.toml')

      // Handle snake_case to camelCase conversion for options
      const options: AgentOptions | undefined = parsed.options
        ? {
            suggestedTools: (parsed.options as Record<string, unknown>).suggested_tools as
              | string[]
              | undefined,
            contextNotes: (parsed.options as Record<string, unknown>).context_notes as
              | string
              | undefined
          }
        : undefined

      return {
        id,
        filePath,
        agent: parsed.agent,
        prompt: parsed.prompt,
        options
      }
    } catch (err) {
      console.error(`Failed to parse agent file ${filePath}:`, err)
      return null
    }
  }

  private watchDirectories(): void {
    // Close existing watchers
    this.dispose()

    // Watch global directory
    if (fs.existsSync(this.globalDirectory)) {
      const watcher = fs.watch(this.globalDirectory, (_eventType, filename) => {
        if (filename?.endsWith('.toml')) {
          console.log(`Agent file changed: ${filename}`)
          this.loadAgents()
          this.changeCallback?.()
        }
      })
      this.watchers.push(watcher)
    }

    // Watch project directory
    if (this.projectDirectory && fs.existsSync(this.projectDirectory)) {
      const watcher = fs.watch(this.projectDirectory, (_eventType, filename) => {
        if (filename?.endsWith('.toml')) {
          console.log(`Project agent file changed: ${filename}`)
          this.loadAgents()
          this.changeCallback?.()
        }
      })
      this.watchers.push(watcher)
    }
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

// Export singleton instance
export const agentManager = new AgentManager()
