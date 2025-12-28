import type { LucideIcon } from 'lucide-react'
import {
  Bot, Folder, Command, Plug, ClipboardList, Sparkles, Puzzle, Package,
  Search, Code, Pencil, Bug, CheckCircle, FileText, Eye, Hammer, Rocket,
  Shield, BarChart3, Zap, Wrench, Clipboard, Target, Lightbulb, RefreshCw,
  Upload, Download, Play, Timer, Link, Pin, Trash2, HelpCircle, Coins,
  Paperclip, Brain, Stethoscope, Clock, Minus, Plus, X, Save, Check,
  Settings, FolderOpen, ChevronRight, ChevronDown, ChevronLeft, FlaskConical,
  Users, SquareTerminal, FileCode, Network, Database, Circle
} from 'lucide-react'

// Re-export individual icons for direct imports
export {
  Bot, Folder, Command, Plug, ClipboardList, Sparkles, Puzzle, Package,
  Search, Code, Pencil, Bug, CheckCircle, FileText, Eye, Hammer, Rocket,
  Shield, BarChart3, Zap, Wrench, Clipboard, Target, Lightbulb, RefreshCw,
  Upload, Download, Play, Timer, Link, Pin, Trash2, HelpCircle, Coins,
  Paperclip, Brain, Stethoscope, Clock, Minus, Plus, X, Save, Check,
  Settings, FolderOpen, ChevronRight, ChevronDown, ChevronLeft, FlaskConical,
  Users, SquareTerminal, FileCode, Network, Database, Circle
}

// Standard icon sizes
export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24
} as const

// Panel tab icons
export const PanelIcons: Record<string, LucideIcon> = {
  project: Folder,
  agents: Bot,
  commands: Command,
  mcp: Plug,
  sessions: ClipboardList,
  skills: Sparkles,
  plugins: Puzzle,
  default: Package
}

// Agent type icons
export const AgentIcons: Record<string, LucideIcon> = {
  default: Bot,
  search: Search,
  code: Code,
  edit: Pencil,
  bug: Bug,
  test: CheckCircle,
  docs: FileText,
  review: Eye,
  build: Hammer,
  deploy: Rocket,
  security: Shield,
  data: BarChart3
}

// Agent icon options for picker (value matches AgentIcons keys)
export const AGENT_ICON_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'search', label: 'Search' },
  { value: 'code', label: 'Code' },
  { value: 'edit', label: 'Edit' },
  { value: 'bug', label: 'Bug' },
  { value: 'test', label: 'Test' },
  { value: 'docs', label: 'Docs' },
  { value: 'review', label: 'Review' },
  { value: 'build', label: 'Build' },
  { value: 'deploy', label: 'Deploy' },
  { value: 'security', label: 'Security' },
  { value: 'data', label: 'Data' }
] as const

// Command icon options for picker (value is the icon key)
export const CommandIcons: Record<string, LucideIcon> = {
  zap: Zap,
  wrench: Wrench,
  clipboard: Clipboard,
  target: Target,
  lightbulb: Lightbulb,
  refresh: RefreshCw,
  upload: Upload,
  download: Download,
  play: Play,
  timer: Timer,
  link: Link,
  pin: Pin
}

export const COMMAND_ICON_OPTIONS = [
  { value: 'zap', label: 'Lightning' },
  { value: 'wrench', label: 'Wrench' },
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'target', label: 'Target' },
  { value: 'lightbulb', label: 'Idea' },
  { value: 'refresh', label: 'Sync' },
  { value: 'upload', label: 'Upload' },
  { value: 'download', label: 'Download' },
  { value: 'play', label: 'Run' },
  { value: 'timer', label: 'Timer' },
  { value: 'link', label: 'Link' },
  { value: 'pin', label: 'Pin' }
] as const

// Skills category icons
export const SkillCategoryIcons: Record<string, LucideIcon> = {
  research: Search,
  coding: Code,
  testing: FlaskConical,
  devops: Wrench,
  collaboration: Users,
  custom: Zap
}

// Built-in command icons
export const BuiltInCommandIcons: Record<string, LucideIcon> = {
  clear: Trash2,
  compact: Package,
  resume: Play,
  help: HelpCircle,
  cost: Coins,
  context: Paperclip,
  memory: Brain,
  review: Eye,
  model: Bot,
  doctor: Stethoscope
}

// UI control icons
export const UIIcons = {
  close: X,
  settings: Settings,
  save: Save,
  check: Check,
  plus: Plus,
  minus: Minus,
  refresh: RefreshCw,
  edit: Pencil,
  trash: Trash2,
  help: HelpCircle,
  clock: Clock,
  folder: Folder,
  folderOpen: FolderOpen,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  plug: Plug,
  bot: Bot
} as const

// Helper function to get agent icon component
export function getAgentIcon(iconKey?: string): LucideIcon {
  return AgentIcons[iconKey || 'default'] || AgentIcons.default
}

// Helper function to get command icon component
export function getCommandIcon(iconKey?: string): LucideIcon {
  return CommandIcons[iconKey || 'zap'] || CommandIcons.zap
}

// Helper function to get panel icon component
export function getPanelIcon(panelType?: string): LucideIcon {
  return PanelIcons[panelType || 'default'] || PanelIcons.default
}
