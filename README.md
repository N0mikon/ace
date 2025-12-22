# ACE - AI Command Environment

A terminal-anchored control surface for AI-assisted development workflows. ACE wraps terminal-based AI coding tools (Claude Code first, others later) with a visual interface for launching agents, managing hotkeys, and maintaining session history.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-28.x-47848F.svg)

## Features

- **Embedded Terminal** - Full PTY terminal (node-pty + xterm.js) with Git Bash or cmd.exe
- **Agent System** - TOML-defined agents with hotkey activation and prompt injection
- **Session Logging** - SQLite-backed session history with markdown export
- **MCP Visibility** - View configured MCP servers and tools from Claude Code
- **Global Hotkeys** - Keyboard-driven workflow with customizable shortcuts
- **Tool Adapters** - Extensible adapter system for different AI CLI tools
- **Multi-Project** - Recent projects list with quick switching

## Screenshot

```
┌────────────────────────────────────────────────────────────────┐
│                         ACE Window                              │
│                                                                 │
│  ┌──────────────────────────────────┐  ┌─────────────────────┐ │
│  │                                  │  │    Project Panel    │ │
│  │                                  │  │    Agent Panel      │ │
│  │         Terminal                 │  │    Command Panel    │ │
│  │         (xterm.js)               │  │    MCP Panel        │ │
│  │                                  │  │    Sessions Panel   │ │
│  │                                  │  │                     │ │
│  │                                  │  │    [Settings]       │ │
│  └──────────────────────────────────┘  └─────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Status Bar: Ready | Session: 00:12:34 | Agents: 3 | MCP: 2 ││
│  └────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js 18+
- Git (for Git Bash on Windows)
- Windows 10/11 (primary platform)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ace.git
cd ace

# Install dependencies
npm install

# Rebuild native modules (node-pty, better-sqlite3)
npm run postinstall

# Run in development mode
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Package for Windows
npm run build:win
```

## Configuration

ACE stores configuration in `%APPDATA%/ace/ace/config.toml`:

```toml
[general]
theme = "dark"
accentColor = "#007acc"

[shell]
path = "C:/Program Files/Git/bin/bash.exe"
args = ["--login", "-i"]
fallback = "cmd.exe"

[terminal]
fontFamily = "Cascadia Code, Consolas, monospace"
fontSize = 14
scrollback = 10000

[claudeCode]
configPath = "C:/Users/Name/.claude/"
mcpConfig = "C:/Users/Name/.claude/claude_desktop_config.json"

[logging]
enabled = true
autoExport = true
```

## Agents

Define agents in TOML files in `%APPDATA%/ace/ace/agents/`:

```toml
# researcher.toml
[agent]
name = "Researcher"
description = "Deep research with web search focus"
hotkey = "Ctrl+1"
icon = "search"

[prompt]
text = """
You are a research-focused agent. For this task:
- Prioritize using web search for current information
- Provide citations for all factual claims
"""

[options]
suggested_tools = ["web_search", "fetch"]
```

## Tool Adapters

ACE uses a TOML-based adapter system to support different AI CLI tools. Default adapter: `adapters/claude-code.toml`

```toml
[adapter]
name = "Claude Code"
launch_command = "claude"
detect_pattern = "Claude Code"

[commands]
exit = "/exit"
compact = "/compact"
clear = "/clear"

[flags]
resume = "--resume"
continue = "--continue"
```

## Default Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+E` | Send /exit |
| `Ctrl+Shift+C` | Send /compact |
| `Ctrl+Shift+K` | Send /clear |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+,` | Open settings |
| `Ctrl+1-9` | Activate agents |

## Project Structure

```
ace/
├── src/
│   ├── main/           # Electron main process
│   │   ├── terminal/   # PTY management
│   │   ├── config/     # TOML config, agents, MCP, adapters
│   │   ├── storage/    # SQLite database, session logging
│   │   ├── hotkeys/    # Global hotkey management
│   │   ├── projects/   # Multi-project support
│   │   └── window/     # Window state persistence
│   ├── preload/        # Electron preload scripts
│   └── renderer/       # React frontend
│       └── components/
│           ├── Terminal/
│           ├── Sidebar/
│           ├── StatusBar/
│           └── Settings/
├── adapters/           # Tool adapter definitions
├── default-agents/     # Example agent definitions
└── resources/          # Build resources
```

## Development

```bash
# Run development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron 28 |
| Language | TypeScript |
| Terminal PTY | node-pty |
| Terminal Renderer | xterm.js |
| UI Framework | React 18 |
| State Management | Zustand |
| Database | SQLite (better-sqlite3) |
| Config | TOML (@iarna/toml) |
| Build | electron-vite |

## Roadmap

### Phase 1 (Complete)
- [x] Terminal integration (node-pty + xterm.js)
- [x] Configuration system (TOML)
- [x] Session logging (SQLite + markdown export)
- [x] Agent system with hot-reload
- [x] Global hotkey system
- [x] MCP server visibility
- [x] Tool adapter system
- [x] Multi-project support

### Phase 2 (Planned)
- [ ] Light theme support
- [ ] Custom quick commands UI
- [ ] Session search improvements
- [ ] Agent drag-and-drop reordering
- [ ] Adapter selection UI
- [ ] First-run setup wizard
- [ ] Auto-updater

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [node-pty](https://github.com/microsoft/node-pty) - PTY management
- [electron-vite](https://electron-vite.org/) - Build tooling
- VS Code terminal implementation for architectural inspiration
