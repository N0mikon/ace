/**
 * Skills Manager for ACE
 * Manages on-demand skills that Claude uses automatically
 *
 * Note: This is a stub implementation. Skills are discovered from:
 * 1. Built-in Claude capabilities
 * 2. Plugins that provide skills
 * 3. Project-specific skill configurations
 */

export type SkillCategory = 'research' | 'coding' | 'testing' | 'devops' | 'collaboration' | 'custom'

export interface Skill {
  id: string
  name: string
  description: string
  category: SkillCategory
  provider: string // Plugin that provides it, or 'builtin'
  enabled: boolean
  icon?: string
}

class SkillsManager {
  private globalSkills: Map<string, Skill> = new Map()
  private projectSkills: Map<string, Skill> = new Map()
  private currentProjectPath: string | null = null
  private changeCallback: (() => void) | null = null

  /**
   * Initialize the skills manager
   */
  init(): void {
    this.loadBuiltinSkills()
  }

  /**
   * Set callback for skill changes
   */
  onChanged(callback: () => void): void {
    this.changeCallback = callback
  }

  /**
   * Set the current project path
   */
  async setProjectPath(projectPath: string | null): Promise<void> {
    this.currentProjectPath = projectPath
    await this.loadProjectSkills()
  }

  /**
   * Get project-specific skills (for SkillsPanel)
   */
  list(): Skill[] {
    // Combine project skills with enabled global skills
    const skills = new Map(this.projectSkills)

    // Add global skills that aren't overridden by project
    for (const [id, skill] of this.globalSkills) {
      if (!skills.has(id)) {
        skills.set(id, skill)
      }
    }

    return Array.from(skills.values()).sort((a, b) => {
      // Sort by category, then by name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Get all global skills (for wizard selection)
   */
  listGlobal(): Skill[] {
    return Array.from(this.globalSkills.values())
  }

  /**
   * Toggle a skill's enabled state
   */
  async toggle(skillId: string, enabled: boolean): Promise<{ success: boolean }> {
    const skill = this.projectSkills.get(skillId) || this.globalSkills.get(skillId)
    if (skill) {
      skill.enabled = enabled
      // TODO: Persist to project config
      this.changeCallback?.()
    }
    return { success: true }
  }

  /**
   * Reload skills from disk
   */
  async reload(): Promise<Skill[]> {
    this.loadBuiltinSkills()
    await this.loadProjectSkills()
    return this.list()
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.globalSkills.clear()
    this.projectSkills.clear()
  }

  // Private methods

  private loadBuiltinSkills(): void {
    // Define built-in Claude capabilities as skills
    const builtins: Skill[] = [
      {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the web for current information',
        category: 'research',
        provider: 'builtin',
        enabled: true,
        icon: '🔍'
      },
      {
        id: 'code-analysis',
        name: 'Code Analysis',
        description: 'Analyze and understand code structure',
        category: 'coding',
        provider: 'builtin',
        enabled: true,
        icon: '🔬'
      },
      {
        id: 'code-generation',
        name: 'Code Generation',
        description: 'Generate new code based on requirements',
        category: 'coding',
        provider: 'builtin',
        enabled: true,
        icon: '⚡'
      },
      {
        id: 'file-operations',
        name: 'File Operations',
        description: 'Read, write, and modify files',
        category: 'coding',
        provider: 'builtin',
        enabled: true,
        icon: '📁'
      },
      {
        id: 'terminal-access',
        name: 'Terminal Access',
        description: 'Execute shell commands',
        category: 'devops',
        provider: 'builtin',
        enabled: true,
        icon: '💻'
      },
      {
        id: 'git-operations',
        name: 'Git Operations',
        description: 'Version control with Git',
        category: 'devops',
        provider: 'builtin',
        enabled: true,
        icon: '🔀'
      }
    ]

    this.globalSkills.clear()
    for (const skill of builtins) {
      this.globalSkills.set(skill.id, skill)
    }
  }

  private async loadProjectSkills(): Promise<void> {
    this.projectSkills.clear()

    if (!this.currentProjectPath) {
      return
    }

    try {
      // Import here to avoid circular dependency
      const { projectConfigManager } = await import('../projects/config')
      const skills = await projectConfigManager.getSkills(this.currentProjectPath)

      for (const skillConfig of skills) {
        // Convert SkillConfig to Skill with proper category type
        const skill: Skill = {
          ...skillConfig,
          category: (skillConfig.category as SkillCategory) || 'custom'
        }
        this.projectSkills.set(skill.id, skill)
      }
    } catch (err) {
      // Project may not have skill configuration yet
      console.log('No project skills found:', err)
    }
  }
}

// Export singleton instance
export const skillsManager = new SkillsManager()
