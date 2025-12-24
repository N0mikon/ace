/**
 * Launch Options
 * Checkboxes for Claude Code launch flags
 */

import { LaunchOptions as LaunchOptionsType } from '../../stores/projectStore'

interface LaunchOptionsProps {
  options: LaunchOptionsType
  onChange: (options: Partial<LaunchOptionsType>) => void
}

interface OptionConfig {
  key: keyof LaunchOptionsType
  label: string
  description: string
  flag: string
}

const OPTIONS: OptionConfig[] = [
  {
    key: 'resume',
    label: 'Resume last session',
    description: 'Continue from where you left off',
    flag: '--resume'
  },
  {
    key: 'bypassMode',
    label: 'Bypass permissions',
    description: 'Skip all permission prompts (use with caution)',
    flag: '--dangerously-skip-permissions'
  },
  {
    key: 'verbose',
    label: 'Verbose output',
    description: 'Show detailed logging information',
    flag: '--verbose'
  },
  {
    key: 'printMode',
    label: 'Print mode',
    description: 'Output responses without interactive mode',
    flag: '--print'
  }
]

export function LaunchOptions({ options, onChange }: LaunchOptionsProps): JSX.Element {
  return (
    <div className="launch-options">
      {OPTIONS.map((option) => (
        <label key={option.key} className="option-item">
          <input
            type="checkbox"
            checked={options[option.key]}
            onChange={(e) => onChange({ [option.key]: e.target.checked })}
          />
          <div className="option-content">
            <span className="option-label">{option.label}</span>
            <span className="option-flag">{option.flag}</span>
          </div>
        </label>
      ))}
    </div>
  )
}

export default LaunchOptions
