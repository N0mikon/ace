/**
 * Agent system for ACE
 * Loads, parses, and watches agent Markdown files with YAML frontmatter
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

// Markdown agent file structure (with YAML frontmatter)
interface MdAgentFile {
  name: string
  description: string
  tools?: string
  model?: string
  color?: string
  hotkey?: string
  icon?: string
  prompt: string
}

/**
 * Parse a markdown agent file with YAML frontmatter
 */
function parseMdAgentFile(content: string): MdAgentFile | null {
  // Match YAML frontmatter between --- delimiters
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)

  if (!frontmatterMatch) {
    return null
  }

  const frontmatter = frontmatterMatch[1]
  const body = frontmatterMatch[2].trim()

  // Parse YAML frontmatter (simple key: value parsing)
  const fields: Record<string, string> = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^(\w+):\s*(.*)$/)
    if (match) {
      fields[match[1]] = match[2].trim()
    }
  }

  if (!fields.name || !fields.description) {
    return null
  }

  return {
    name: fields.name,
    description: fields.description,
    tools: fields.tools,
    model: fields.model,
    color: fields.color,
    hotkey: fields.hotkey,
    icon: fields.icon,
    prompt: body
  }
}

// Agent definition types
export interface AgentPrompt {
  text: string
}

export interface AgentOptions {
  suggestedTools?: string[]
  contextNotes?: string
  tools?: string // Comma-separated tool list from MD
  model?: string // Model preference (sonnet, opus, haiku)
  color?: string // UI color hint
}

export interface AgentDefinition {
  name: string
  description: string
  hotkey?: string
  icon?: string
  tools?: string // Comma-separated tool list from MD
  model?: string // Model preference (sonnet, opus, haiku)
  color?: string // UI color hint
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
      // Validate MD format before saving
      const parsed = parseMdAgentFile(content)
      if (!parsed) {
        return {
          success: false,
          error: 'Invalid markdown format: missing frontmatter or required fields (name, description)'
        }
      }

      fs.writeFileSync(agent.filePath, content, 'utf-8')
      this.loadAgents()
      this.changeCallback?.()
      return { success: true }
    } catch (err) {
      return { success: false, error: `Failed to save file: ${err}` }
    }
  }

  /**
   * Create a new agent file from template
   */
  createAgent(name: string, description: string, promptText: string): string | null {
    const fileName = this.sanitizeFileName(name) + '.md'
    const filePath = path.join(this.globalDirectory, fileName)

    if (fs.existsSync(filePath)) {
      console.warn(`Agent file already exists: ${filePath}`)
      return null
    }

    const content = `---
name: ${name}
description: ${description}
---

${promptText}
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

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))

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
      const parsed = parseMdAgentFile(content)

      if (!parsed) {
        console.warn(`Invalid agent file (missing frontmatter or required fields): ${filePath}`)
        return null
      }

      // Generate ID from filename (remove .md extension)
      const id = path.basename(filePath, '.md')

      return {
        id,
        filePath,
        agent: {
          name: parsed.name,
          description: parsed.description,
          hotkey: parsed.hotkey,
          icon: parsed.icon,
          tools: parsed.tools,
          model: parsed.model,
          color: parsed.color
        },
        prompt: {
          text: parsed.prompt
        },
        options: {
          tools: parsed.tools,
          model: parsed.model,
          color: parsed.color
        }
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
        if (filename?.endsWith('.md')) {
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
        if (filename?.endsWith('.md')) {
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
