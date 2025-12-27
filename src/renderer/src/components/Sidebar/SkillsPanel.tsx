/**
 * Skills Panel Component
 * Displays on-demand skills that Claude uses automatically
 * These are capabilities available to the AI, not user-invoked commands
 */

import { useState, useEffect } from 'react'
import { api } from '../../api'
import { Skill, SkillCategory } from '../../api/types'
import { useLayoutStore } from '../../stores/layoutStore'
import { PanelSettingsButton } from '../common/PanelSettingsPopover'
import './SkillsPanel.css'

// Category display names and order
const CATEGORY_INFO: Record<SkillCategory, { label: string; icon: string }> = {
  research: { label: 'Research', icon: '🔍' },
  coding: { label: 'Coding', icon: '💻' },
  testing: { label: 'Testing', icon: '🧪' },
  devops: { label: 'DevOps', icon: '🔧' },
  collaboration: { label: 'Collaboration', icon: '👥' },
  custom: { label: 'Custom', icon: '⚡' }
}

const CATEGORY_ORDER: SkillCategory[] = [
  'coding',
  'research',
  'testing',
  'devops',
  'collaboration',
  'custom'
]

interface SkillsPanelProps {
  isHorizontal?: boolean
}

export function SkillsPanel({ isHorizontal = false }: SkillsPanelProps): JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<SkillCategory>>(
    new Set(['coding', 'research'])
  )
  const panelSettings = useLayoutStore((state) => state.panelSettings)
  const settings = panelSettings['skills'] || { fontSize: 1.0, preferredSize: 20 }

  useEffect(() => {
    loadSkills()

    // Subscribe to skill changes
    const unsubscribe = api.skills?.onChanged?.(() => {
      loadSkills()
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const loadSkills = async (): Promise<void> => {
    try {
      const skillList = await api.skills?.list?.() ?? []
      setSkills(skillList)
    } catch (error) {
      console.error('Failed to load skills:', error)
      setSkills([])
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category: SkillCategory): void => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Group skills by category
  const skillsByCategory = skills.reduce(
    (acc, skill) => {
      const category = skill.category || 'custom'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(skill)
      return acc
    },
    {} as Record<SkillCategory, Skill[]>
  )

  // Only show categories that have skills
  const activeCategories = CATEGORY_ORDER.filter(
    (cat) => skillsByCategory[cat]?.length > 0
  )

  const panelClass = `skills-panel ${isHorizontal ? 'horizontal' : 'vertical'}`
  const panelStyle = { '--font-scale': settings.fontSize } as React.CSSProperties

  if (loading) {
    return (
      <div className={panelClass} style={panelStyle}>
        <div className="panel-header">
          <span className="panel-title">Skills</span>
          <PanelSettingsButton panelId="skills" />
        </div>
        <div className="skills-loading">Loading skills...</div>
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <div className={panelClass} style={panelStyle}>
        <div className="panel-header">
          <span className="panel-title">Skills</span>
          <PanelSettingsButton panelId="skills" />
        </div>
        <div className="skills-empty">
          <p>No skills available</p>
          <p className="skills-empty-hint">
            Skills are on-demand capabilities that Claude uses automatically when needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={panelClass} style={panelStyle}>
      <div className="panel-header">
        <span className="panel-title">Skills</span>
        <div className="header-actions">
          <PanelSettingsButton panelId="skills" />
        </div>
      </div>
      <div className="skills-list">
        {activeCategories.map((category) => {
          const categorySkills = skillsByCategory[category] || []
          const isExpanded = expandedCategories.has(category)
          const info = CATEGORY_INFO[category]

          return (
            <div key={category} className="skills-category">
              <button
                className="skills-category-header"
                onClick={() => toggleCategory(category)}
                title={`${isExpanded ? 'Collapse' : 'Expand'} ${info.label}`}
              >
                <span className="skills-category-icon">{info.icon}</span>
                <span className="skills-category-name">{info.label}</span>
                <span className="skills-category-count">{categorySkills.length}</span>
                <span className={`skills-category-chevron ${isExpanded ? 'expanded' : ''}`}>
                  &#9654;
                </span>
              </button>
              {isExpanded && (
                <div className="skills-category-items">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`skill-item ${skill.enabled ? 'enabled' : 'disabled'}`}
                      title={skill.description}
                    >
                      <span className="skill-icon">{skill.icon || '●'}</span>
                      <div className="skill-info">
                        <span className="skill-name">{skill.name}</span>
                        {skill.provider !== 'builtin' && (
                          <span className="skill-provider">via {skill.provider}</span>
                        )}
                      </div>
                      <span
                        className={`skill-status ${skill.enabled ? 'active' : 'inactive'}`}
                        title={skill.enabled ? 'Active' : 'Inactive'}
                      >
                        {skill.enabled ? '●' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SkillsPanel
