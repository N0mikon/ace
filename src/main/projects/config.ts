/**
 * Project Config Manager
 * Handles loading and saving .aceproj configuration files
 */

import * as fs from 'fs'
import * as path from 'path'
import * as TOML from '@iarna/toml'

export interface LaunchConfig {
  bypass_mode: boolean
  resume: boolean
  verbose: boolean
  print_mode: boolean
}

export interface AgentsConfig {
  include_global: boolean
}

export interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface McpProjectConfig {
  servers: Record<string, McpServerConfig>
}

export interface AceProjectConfig {
  project: {
    name: string
    path: string
  }
  launch: LaunchConfig
  agents: AgentsConfig
  mcp?: McpProjectConfig
}

export class ProjectConfigManager {
  /**
   * Load project config from .aceproj file
   */
  async load(projectPath: string): Promise<AceProjectConfig | null> {
    const configPath = this.getConfigPath(projectPath)

    if (!fs.existsSync(configPath)) {
      return null
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      const parsed = TOML.parse(content) as unknown as AceProjectConfig
      return parsed
    } catch (error) {
      console.error(`Failed to parse .aceproj at ${configPath}:`, error)
      return null
    }
  }

  /**
   * Save project config to .aceproj file
   */
  async save(projectPath: string, config: Partial<AceProjectConfig>): Promise<void> {
    const configPath = this.getConfigPath(projectPath)

    // Load existing or create defaults
    const existing = (await this.load(projectPath)) || this.getDefaults(projectPath)

    // Deep merge
    const merged: AceProjectConfig = {
      project: {
        ...existing.project,
        ...(config.project || {})
      },
      launch: {
        ...existing.launch,
        ...(config.launch || {})
      },
      agents: {
        ...existing.agents,
        ...(config.agents || {})
      },
      mcp: config.mcp !== undefined ? config.mcp : existing.mcp
    }

    try {
      const tomlContent = TOML.stringify(merged as unknown as TOML.JsonMap)
      fs.writeFileSync(configPath, tomlContent, 'utf-8')
    } catch (error) {
      console.error(`Failed to save .aceproj at ${configPath}:`, error)
      throw error
    }
  }

  /**
   * Initialize a new ACE project
   * Creates .ace/project.aceproj file
   * Project agents go in .claude/agents/ (Claude Code convention)
   */
  async initialize(projectPath: string): Promise<void> {
    // Create .ace/ directory for ACE config
    const aceDir = path.join(projectPath, '.ace')
    fs.mkdirSync(aceDir, { recursive: true })

    // Create default .aceproj in .ace/
    await this.save(projectPath, this.getDefaults(projectPath))

    // Create .claude/agents/ directory for project-specific agents
    // This follows Claude Code conventions
    const claudeAgentsDir = path.join(projectPath, '.claude', 'agents')
    if (!fs.existsSync(claudeAgentsDir)) {
      fs.mkdirSync(claudeAgentsDir, { recursive: true })

      // Create a sample agent file
      const sampleAgentPath = path.join(claudeAgentsDir, 'example.toml')
      const sampleAgent = `# Example Project Agent
# Project-specific agents live in .claude/agents/
# Global agents are in ACE's app data directory

[agent]
name = "Project Helper"
description = "A helpful agent for this project"
# hotkey = "Ctrl+1"  # Uncomment to assign a hotkey

[prompt]
text = """
You are a helpful assistant for this project.
Focus on providing clear, accurate information.
"""
`
      fs.writeFileSync(sampleAgentPath, sampleAgent, 'utf-8')
    }
  }

  /**
   * Check if a project has an .aceproj file
   */
  hasConfig(projectPath: string): boolean {
    return fs.existsSync(this.getConfigPath(projectPath))
  }

  /**
   * Get the path to the .aceproj file (in .ace/ directory)
   */
  private getConfigPath(projectPath: string): string {
    return path.join(projectPath, '.ace', 'project.aceproj')
  }

  /**
   * Get the project agents directory (.claude/agents/)
   */
  getAgentsDir(projectPath: string): string {
    return path.join(projectPath, '.claude', 'agents')
  }

  /**
   * Get MCP servers configured for this project
   */
  async getMcpServers(projectPath: string): Promise<Record<string, McpServerConfig>> {
    const config = await this.load(projectPath)
    return config?.mcp?.servers || {}
  }

  /**
   * Add an MCP server to the project config
   */
  async addMcpServer(
    projectPath: string,
    name: string,
    serverConfig: McpServerConfig
  ): Promise<void> {
    const config = await this.load(projectPath)
    const existingServers = config?.mcp?.servers || {}

    await this.save(projectPath, {
      mcp: {
        servers: {
          ...existingServers,
          [name]: serverConfig
        }
      }
    })
  }

  /**
   * Remove an MCP server from the project config
   */
  async removeMcpServer(projectPath: string, name: string): Promise<void> {
    const config = await this.load(projectPath)
    const existingServers = config?.mcp?.servers || {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [name]: _, ...remaining } = existingServers

    await this.save(projectPath, {
      mcp: {
        servers: remaining
      }
    })
  }

  /**
   * Get default config values
   */
  private getDefaults(projectPath: string): AceProjectConfig {
    return {
      project: {
        name: path.basename(projectPath),
        path: projectPath
      },
      launch: {
        bypass_mode: false,
        resume: true,
        verbose: false,
        print_mode: false
      },
      agents: {
        include_global: true
      }
    }
  }
}

export const projectConfigManager = new ProjectConfigManager()
