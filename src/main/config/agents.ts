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
  private agents: Map<string, Agent> = new Map()
  private globalDirectory: string = ''
  private projectDirectory: string | null = null
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

    // Install default agents on first run
    this.installDefaultAgents()

    this.loadAgents()
    this.watchDirectories()
  }

  /**
   * Install default agents from resources to global directory
   * Only copies agents that don't already exist to avoid overwriting customizations
   */
  private installDefaultAgents(): void {
    // In production, resources are in the app's resources folder
    // In development, they're in the project root
    const resourcePaths = [
      path.join(process.resourcesPath, 'default-agents'),
      path.join(app.getAppPath(), 'resources', 'default-agents'),
      path.join(__dirname, '..', '..', '..', 'resources', 'default-agents')
    ]

    let defaultAgentsDir: string | null = null
    for (const p of resourcePaths) {
      if (fs.existsSync(p)) {
        defaultAgentsDir = p
        break
      }
    }

    if (!defaultAgentsDir) {
      console.log('No default agents directory found')
      return
    }

    try {
      const files = fs.readdirSync(defaultAgentsDir).filter((f) => f.endsWith('.toml'))
      let installed = 0

      for (const file of files) {
        const targetPath = path.join(this.globalDirectory, file)

        // Only copy if it doesn't exist (don't overwrite user customizations)
        if (!fs.existsSync(targetPath)) {
          const sourcePath = path.join(defaultAgentsDir, file)
          fs.copyFileSync(sourcePath, targetPath)
          installed++
          console.log(`Installed default agent: ${file}`)
        }
      }

      if (installed > 0) {
        console.log(`Installed ${installed} default agent(s)`)
      }
    } catch (err) {
      console.error('Failed to install default agents:', err)
    }
  }

  /**
   * Set project-specific agents directory
   */
  setProjectDirectory(dir: string | null): void {
    this.projectDirectory = dir
    this.loadAgents()
    this.watchDirectories()
  }

  /**
   * Set callback for agent changes
   */
  onAgentsChanged(callback: () => void): void {
    this.changeCallback = callback
  }

  /**
   * Get all loaded agents
   */
  list(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get a specific agent by ID
   */
  get(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  /**
   * Get an agent's prompt text
   */
  getPrompt(id: string): string | undefined {
    const agent = this.agents.get(id)
    return agent?.prompt.text
  }

  /**
   * Open an agent file in the default editor
   */
  openFile(id: string): boolean {
    const agent = this.agents.get(id)
    if (agent) {
      const { shell } = require('electron')
      shell.openPath(agent.filePath)
      return true
    }
    return false
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
   */
  copyToProject(id: string, projectPath: string): { success: boolean; filePath?: string; error?: string } {
    const agent = this.agents.get(id)
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

  private loadAgents(): void {
    this.agents.clear()

    // Load global agents
    this.loadAgentsFromDirectory(this.globalDirectory)

    // Load project-specific agents (override global)
    if (this.projectDirectory && fs.existsSync(this.projectDirectory)) {
      this.loadAgentsFromDirectory(this.projectDirectory)
    }

    console.log(`Loaded ${this.agents.size} agents`)
  }

  private loadAgentsFromDirectory(dir: string): void {
    if (!fs.existsSync(dir)) return

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.toml'))

    for (const file of files) {
      const filePath = path.join(dir, file)
      const agent = this.parseAgentFile(filePath)
      if (agent) {
        this.agents.set(agent.id, agent)
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
