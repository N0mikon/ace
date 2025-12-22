import { existsSync } from 'fs'
import { platform } from 'os'

export interface ShellConfig {
  path: string
  args: string[]
}

const GIT_BASH_PATHS = [
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  `${process.env.LOCALAPPDATA}\\Programs\\Git\\bin\\bash.exe`,
  `${process.env.USERPROFILE}\\AppData\\Local\\Programs\\Git\\bin\\bash.exe`
]

/**
 * Detects the best available shell on the system
 * Priority: Git Bash > cmd.exe (Windows)
 */
export function detectShell(): ShellConfig {
  if (platform() !== 'win32') {
    // Unix-like systems
    return {
      path: process.env.SHELL || '/bin/bash',
      args: ['--login']
    }
  }

  // Windows: Try Git Bash first
  for (const gitBashPath of GIT_BASH_PATHS) {
    if (existsSync(gitBashPath)) {
      return {
        path: gitBashPath,
        args: ['--login', '-i']
      }
    }
  }

  // Fallback to cmd.exe
  return {
    path: 'cmd.exe',
    args: []
  }
}

/**
 * Gets shell configuration, preferring user config over auto-detection
 */
export function getShellConfig(userConfig?: Partial<ShellConfig>): ShellConfig {
  const detected = detectShell()

  if (userConfig?.path && existsSync(userConfig.path)) {
    return {
      path: userConfig.path,
      args: userConfig.args ?? detected.args
    }
  }

  return detected
}
