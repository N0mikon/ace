/**
 * API Bridge
 * Maps WebSocket RPC calls to existing main process handlers.
 * Mirrors the IPC handlers defined throughout the codebase.
 */

import { configManager, agentManager, mcpConfigManager, adapterManager } from '../config'
import { databaseManager, sessionLogger } from '../storage'
import { mainPty } from '../terminal/pty'
import { hotkeyManager, APP_ACTIONS } from '../hotkeys/manager'
import { projectManager, projectConfigManager, LayoutConfig } from '../projects'
import { startServer, stopServer, isServerRunning, getPort, getClientCount, clientManager } from './index'

/**
 * Handle an RPC call from a WebSocket client
 */
export async function handleRpcCall(channel: string, args: unknown[]): Promise<unknown> {
  // Terminal API
  if (channel === 'terminal:spawn') {
    const options = args[0] as { cols?: number; rows?: number; cwd?: string } | undefined
    return { success: mainPty.spawn(options) }
  }
  if (channel === 'terminal:write') {
    mainPty.write(args[0] as string)
    return { success: true }
  }
  if (channel === 'terminal:resize') {
    mainPty.resize(args[0] as number, args[1] as number)
    return { success: true }
  }
  if (channel === 'terminal:kill') {
    mainPty.kill()
    return { success: true }
  }
  if (channel === 'terminal:isRunning') {
    return { running: mainPty.isRunning() }
  }
  if (channel === 'terminal:getBuffer') {
    return mainPty.getBuffer()
  }

  // Config API
  if (channel === 'config:get') {
    return configManager.getConfig()
  }
  if (channel === 'config:getValue') {
    return configManager.get(args[0] as string)
  }
  if (channel === 'config:set') {
    configManager.set(args[0] as string, args[1])
    return { success: true }
  }
  if (channel === 'config:update') {
    const updates = args[0] as Record<string, Record<string, unknown>>
    for (const [section, values] of Object.entries(updates)) {
      if (typeof values === 'object' && values !== null) {
        for (const [key, value] of Object.entries(values)) {
          configManager.set(`${section}.${key}`, value)
        }
      }
    }
    return { success: true, config: configManager.getConfig() }
  }
  if (channel === 'config:isFirstRun') {
    return configManager.isFirstRun()
  }
  if (channel === 'config:getPaths') {
    return {
      configDir: configManager.getConfigDir(),
      configFile: configManager.getConfigPath()
    }
  }
  if (channel === 'config:reload') {
    configManager.load()
    return configManager.getConfig()
  }

  // Session API
  if (channel === 'session:list') {
    return databaseManager.listSessions(args[0] as number | undefined, args[1] as number | undefined)
  }
  if (channel === 'session:get') {
    return databaseManager.getSession(args[0] as number)
  }
  if (channel === 'session:search') {
    return databaseManager.searchSessions(args[0] as string, args[1] as number | undefined)
  }
  if (channel === 'session:delete') {
    return { success: databaseManager.deleteSession(args[0] as number) }
  }
  if (channel === 'session:export') {
    // Legacy export not supported via WebSocket
    return { success: false, error: 'Legacy export not supported' }
  }
  if (channel === 'session:current') {
    return { sessionId: sessionLogger.getCurrentSessionId() }
  }
  if (channel === 'session:count') {
    return { count: databaseManager.getSessionCount() }
  }

  // Log API
  if (channel === 'log:save') {
    return sessionLogger.saveLog(args[0] as string)
  }

  // Agent API
  if (channel === 'agents:list') {
    return agentManager.list()
  }
  if (channel === 'agents:listGlobal') {
    return agentManager.listGlobal()
  }
  if (channel === 'agents:listDefaults') {
    return agentManager.listDefaults()
  }
  if (channel === 'agents:listAllAvailable') {
    return agentManager.listAllAvailable()
  }
  if (channel === 'agents:get') {
    return agentManager.get(args[0] as string)
  }
  if (channel === 'agents:getPrompt') {
    return agentManager.getPrompt(args[0] as string)
  }
  if (channel === 'agents:openFile') {
    return agentManager.openFile(args[0] as string)
  }
  if (channel === 'agents:readFile') {
    return agentManager.readFile(args[0] as string)
  }
  if (channel === 'agents:saveFile') {
    return agentManager.saveFile(args[0] as string, args[1] as string)
  }
  if (channel === 'agents:create') {
    const result = agentManager.createAgent(args[0] as string, args[1] as string, args[2] as string)
    return result ? { success: true, filePath: result } : { success: false }
  }
  if (channel === 'agents:reload') {
    agentManager.reload()
    return agentManager.list()
  }
  if (channel === 'agents:copyToProject') {
    return agentManager.copyToProject(args[0] as string, args[1] as string)
  }
  if (channel === 'agents:getGlobalDirectory') {
    return agentManager.getGlobalDirectory()
  }

  // Hotkey API
  if (channel === 'hotkeys:list') {
    return hotkeyManager.getBindings()
  }
  if (channel === 'hotkeys:getAppActions') {
    return APP_ACTIONS
  }
  if (channel === 'hotkeys:getEntries') {
    return hotkeyManager.getBindingsAsEntries()
  }
  if (channel === 'hotkeys:add') {
    const actionInput = args[1] as { type: 'command' | 'agent' | 'app'; command?: string; agentId?: string; appAction?: string }
    return hotkeyManager.addBinding(
      args[0] as string,
      {
        type: actionInput.type,
        command: actionInput.command,
        agentId: actionInput.agentId,
        appAction: actionInput.appAction as 'toggleLeftPanel' | 'toggleRightPanel' | 'toggleTopPanel' | 'toggleBottomPanel' | 'focusTerminal' | 'openSettings' | undefined
      },
      args[2] as string
    )
  }
  if (channel === 'hotkeys:remove') {
    return { success: hotkeyManager.removeBinding(args[0] as string) }
  }
  if (channel === 'hotkeys:update') {
    return hotkeyManager.updateBinding(args[0] as string, args[1] as string)
  }
  if (channel === 'hotkeys:clearAll') {
    hotkeyManager.unregisterAll()
    return { success: true }
  }
  if (channel === 'hotkeys:loadEntries') {
    hotkeyManager.registerFromEntries(
      args[0] as Array<{
        accelerator: string
        action: { type: 'command' | 'agent' | 'app'; command?: string; agentId?: string; appAction?: string }
        description: string
      }>
    )
    return { success: true }
  }
  if (channel === 'hotkeys:setEnabled') {
    hotkeyManager.setEnabled(args[0] as boolean)
    return { success: true }
  }
  if (channel === 'hotkeys:validate') {
    const accelerator = args[0] as string
    const valid = hotkeyManager.isValidAccelerator(accelerator)
    if (!valid) {
      return { valid: false }
    }
    const conflict = hotkeyManager.hasConflict(accelerator)
    return { valid: true, conflict: conflict || undefined }
  }

  // MCP API
  if (channel === 'mcp:getServers') {
    return mcpConfigManager.getServers()
  }
  if (channel === 'mcp:getGlobalServers') {
    return mcpConfigManager.getGlobalServers()
  }
  if (channel === 'mcp:getServer') {
    return mcpConfigManager.getServer(args[0] as string)
  }
  if (channel === 'mcp:getConfigPath') {
    return mcpConfigManager.getConfigPath()
  }
  if (channel === 'mcp:isLoaded') {
    return mcpConfigManager.isLoaded()
  }
  if (channel === 'mcp:setConfigPath') {
    mcpConfigManager.setConfigPath(args[0] as string)
    return { success: true }
  }
  if (channel === 'mcp:setProjectPath') {
    await mcpConfigManager.setProjectPath(args[0] as string | null)
    return { success: true }
  }
  if (channel === 'mcp:copyToProject') {
    return mcpConfigManager.copyToProject(args[0] as string, args[1] as string)
  }
  if (channel === 'mcp:reload') {
    mcpConfigManager.reload()
    return mcpConfigManager.getServers()
  }
  if (channel === 'mcp:reloadProject') {
    await mcpConfigManager.reloadProject()
    return mcpConfigManager.getServers()
  }

  // Adapter API
  if (channel === 'adapters:list') {
    return adapterManager.getAdapters()
  }
  if (channel === 'adapters:get') {
    return adapterManager.getAdapter(args[0] as string)
  }
  if (channel === 'adapters:getActive') {
    return adapterManager.getActiveAdapter()
  }
  if (channel === 'adapters:getActiveId') {
    return adapterManager.getActiveAdapterId()
  }
  if (channel === 'adapters:setActive') {
    const success = adapterManager.setActiveAdapter(args[0] as string)
    return { success }
  }
  if (channel === 'adapters:getCommand') {
    return adapterManager.getCommand(args[0] as string)
  }
  if (channel === 'adapters:getFlag') {
    return adapterManager.getFlag(args[0] as string)
  }
  if (channel === 'adapters:getLaunchCommand') {
    return adapterManager.getLaunchCommand()
  }
  if (channel === 'adapters:getLaunchCommandWithFlags') {
    return adapterManager.getLaunchCommandWithFlags(args[0] as string[])
  }
  if (channel === 'adapters:reload') {
    adapterManager.initialize()
    return adapterManager.getAdapters()
  }

  // Project API
  if (channel === 'projects:getRecent') {
    return projectManager.getRecentProjects()
  }
  if (channel === 'projects:getCurrent') {
    return {
      path: projectManager.getCurrentProject(),
      name: projectManager.getCurrentProjectName()
    }
  }
  if (channel === 'projects:addRecent') {
    projectManager.addRecentProject(args[0] as string)
    return
  }
  if (channel === 'projects:removeRecent') {
    projectManager.removeRecentProject(args[0] as string)
    return
  }
  if (channel === 'projects:clearRecent') {
    projectManager.clearRecentProjects()
    return
  }
  if (channel === 'projects:open') {
    projectManager.setCurrentProject(args[0] as string)
    return { success: true }
  }
  if (channel === 'projects:hasConfig') {
    return projectManager.hasProjectConfig(args[0] as string)
  }
  if (channel === 'projects:loadConfig') {
    return projectConfigManager.load(args[0] as string)
  }
  if (channel === 'projects:saveConfig') {
    await projectConfigManager.save(args[0] as string, args[1] as Record<string, unknown>)
    return
  }
  if (channel === 'projects:initializeAce') {
    await projectConfigManager.initialize(args[0] as string)
    return
  }
  if (channel === 'projects:openDialog') {
    // File dialog not available via WebSocket
    return null
  }
  if (channel === 'projects:launch') {
    // Launch is complex and involves window manipulation - limited via WebSocket
    projectManager.setCurrentProject(args[0] as string)
    return { success: true }
  }

  // Layout API
  if (channel === 'layout:load') {
    const projectPath = args[0] as string
    const config = await projectConfigManager.load(projectPath)
    return config?.layout || null
  }
  if (channel === 'layout:save') {
    const projectPath = args[0] as string
    const layout = args[1] as LayoutConfig
    await projectConfigManager.save(projectPath, { layout })
    // Broadcast to all clients (including sender) for real-time sync
    clientManager.broadcast({
      type: 'event',
      channel: 'layout:changed',
      data: { projectPath, layout }
    })
    return { success: true }
  }

  // Server API
  if (channel === 'server:start') {
    return startServer()
  }
  if (channel === 'server:stop') {
    return stopServer()
  }
  if (channel === 'server:isRunning') {
    return isServerRunning()
  }
  if (channel === 'server:getPort') {
    return getPort()
  }
  if (channel === 'server:getClientCount') {
    return getClientCount()
  }

  throw new Error(`Unknown channel: ${channel}`)
}

// Get list of available channels (for debugging)
export function getAvailableChannels(): string[] {
  return [
    'terminal:spawn',
    'terminal:write',
    'terminal:resize',
    'terminal:kill',
    'terminal:isRunning',
    'terminal:getBuffer',
    'config:get',
    'config:getValue',
    'config:set',
    'config:update',
    'config:isFirstRun',
    'config:getPaths',
    'config:reload',
    'session:list',
    'session:get',
    'session:search',
    'session:delete',
    'session:export',
    'session:current',
    'session:count',
    'log:save',
    'agents:list',
    'agents:listGlobal',
    'agents:listDefaults',
    'agents:listAllAvailable',
    'agents:get',
    'agents:getPrompt',
    'agents:openFile',
    'agents:readFile',
    'agents:saveFile',
    'agents:create',
    'agents:reload',
    'agents:copyToProject',
    'agents:getGlobalDirectory',
    'hotkeys:list',
    'hotkeys:getAppActions',
    'hotkeys:getEntries',
    'hotkeys:add',
    'hotkeys:remove',
    'hotkeys:update',
    'hotkeys:clearAll',
    'hotkeys:loadEntries',
    'hotkeys:setEnabled',
    'hotkeys:validate',
    'mcp:getServers',
    'mcp:getGlobalServers',
    'mcp:getServer',
    'mcp:getConfigPath',
    'mcp:isLoaded',
    'mcp:setConfigPath',
    'mcp:setProjectPath',
    'mcp:copyToProject',
    'mcp:reload',
    'mcp:reloadProject',
    'adapters:list',
    'adapters:get',
    'adapters:getActive',
    'adapters:getActiveId',
    'adapters:setActive',
    'adapters:getCommand',
    'adapters:getFlag',
    'adapters:getLaunchCommand',
    'adapters:getLaunchCommandWithFlags',
    'adapters:reload',
    'projects:getRecent',
    'projects:getCurrent',
    'projects:addRecent',
    'projects:removeRecent',
    'projects:clearRecent',
    'projects:open',
    'projects:hasConfig',
    'projects:loadConfig',
    'projects:saveConfig',
    'projects:initializeAce',
    'projects:openDialog',
    'projects:launch',
    'layout:load',
    'layout:save',
    'server:start',
    'server:stop',
    'server:isRunning',
    'server:getPort',
    'server:getClientCount'
  ]
}
