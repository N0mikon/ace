import { ipcMain } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { projectManager } from '../projects'

export interface ProjectCommand {
  name: string
  command: string
  description: string
  icon: string
}

export function registerProjectCommandsIpc(): void {
  ipcMain.handle('projectCommands:list', async (): Promise<ProjectCommand[]> => {
    const projectPath = projectManager.getCurrentProject()
    const commandsDir = path.join(projectPath, '.claude', 'commands')

    try {
      const files = await fs.readdir(commandsDir)
      const mdFiles = files.filter(f => f.endsWith('.md'))

      const commands: ProjectCommand[] = []
      for (const file of mdFiles) {
        const content = await fs.readFile(path.join(commandsDir, file), 'utf-8')
        const { data } = matter(content)
        const name = path.basename(file, '.md')

        commands.push({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          command: `/${name}`,
          description: (data.description as string) || `Run ${name} workflow`,
          icon: (data.icon as string) || ''
        })
      }

      return commands.sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      return []
    }
  })
}
