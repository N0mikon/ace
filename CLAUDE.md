\# CLAUDE.md - ACE (AI Command Environment)



\## Project Overview



ACE is a terminal-anchored control surface for AI-assisted development workflows. It wraps terminal-based AI coding tools (Claude Code first, others later) with a visual interface for launching agents, managing hotkeys, and maintaining session history.



\*\*ACE = AI Command Environment\*\*



\*\*Core philosophy:\*\*

\- The terminal is the source of truth — ACE never bypasses it

\- ACE injects commands into the terminal, it doesn't execute logic directly

\- No AI reasoning in ACE itself — it's purely UI, orchestration, and memory

\- Target user: power users who understand agents and context windows but want better ergonomics than raw terminal



\## What ACE Is



\- A control surface / command console

\- A terminal wrapper with persistent memory

\- A hotkey-driven launcher for agents and prompts

\- A session logger and reviewer

\- An MCP server / tool visibility layer



\## What ACE Is NOT



\- Not an IDE — no code editing, no syntax highlighting of source files

\- Not an AI — no reasoning, no decision-making, no model calls

\- Not an API wrapper — all commands flow through the terminal

\- Not a terminal replacement — it embeds and augments a real terminal

\- Not VS Code — we're not building an editor with a terminal, we're building a terminal with controls



\## Technical Architecture



\### Stack



| Layer | Technology | Why |

|-------|------------|-----|

| Framework | Electron | Best terminal embedding ecosystem, VS Code proves it works |

| Language | TypeScript | Claude Code's strongest language, type safety |

| Terminal PTY | node-pty | VS Code's terminal engine, battle-tested |

| Terminal Renderer | xterm.js | VS Code's renderer, handles all edge cases |

| UI Framework | React | Component model fits panel-based UI |

| State Management | Zustand | Simple, minimal boilerplate |

| Storage | SQLite (better-sqlite3) | Local session logs, queryable |

| Config | TOML | Human-editable, cleaner than JSON |



\### Target Shell



\*\*Primary:\*\* Git Bash (ships with Git for Windows) or cmd.exe

\*\*Avoid:\*\* PowerShell (encoding quirks, escaping issues, inconsistent behavior)



The shell should be user-configurable. Default to Git Bash if detected, fall back to cmd.exe.



\### System Architecture

```

┌────────────────────────────────────────────────────────────────┐

│                         ACE Window                              │

│                                                                 │

│  ┌──────────────────────────────────┐  ┌─────────────────────┐ │

│  │                                  │  │    Agent Panel      │ │

│  │                                  │  │  ┌───────────────┐  │ │

│  │                                  │  │  │ Agent 1   \[1] │  │ │

│  │         Terminal                 │  │  │ Agent 2   \[2] │  │ │

│  │         (xterm.js)               │  │  │ Agent 3   \[3] │  │ │

│  │                                  │  │  └───────────────┘  │ │

│  │                                  │  ├─────────────────────┤ │

│  │                                  │  │   MCP Status        │ │

│  │                                  │  │  ● Server A (3)     │ │

│  │                                  │  │  ● Server B (7)     │ │

│  │                                  │  │  ○ Server C (err)   │ │

│  │                                  │  ├─────────────────────┤ │

│  │                                  │  │   Quick Commands    │ │

│  │                                  │  │  \[Compact] \[Exit]   │ │

│  │                                  │  │  \[Resume]  \[Clear]  │ │

│  └──────────────────────────────────┘  └─────────────────────┘ │

│  ┌────────────────────────────────────────────────────────────┐│

│  │ Status Bar: Session: 00:34:21 | Tokens: ~12k | Log: Active ││

│  └────────────────────────────────────────────────────────────┘│

└────────────────────────────────────────────────────────────────┘

```



\### Data Flow

```

User clicks \[Agent Button] or presses hotkey

&nbsp;        │

&nbsp;        ▼

┌─────────────────────┐

│  Command Dispatcher │ ← Resolves agent → prompt text

└──────────┬──────────┘

&nbsp;          │

&nbsp;          ▼ (writes string to PTY stdin)

┌─────────────────────┐

│      node-pty       │ ← Spawns shell process (Git Bash/cmd)

└──────────┬──────────┘

&nbsp;          │

&nbsp;          ▼

┌─────────────────────┐

│   Claude Code CLI   │ ← Running inside the PTY

└──────────┬──────────┘

&nbsp;          │

&nbsp;          ▼ (stdout/stderr)

┌─────────────────────┐

│      xterm.js       │ ← Renders output

└──────────┬──────────┘

&nbsp;          │

&nbsp;          ▼

┌─────────────────────┐

│   Session Logger    │ ← Captures all I/O to SQLite + markdown

└─────────────────────┘

```



\## Feature Specification



\### 1. Terminal Core



\*\*Embedded PTY Terminal\*\*

\- Full PTY via node-pty, not a fake/simulated terminal

\- xterm.js rendering with proper ANSI support

\- Resizable, follows window dimensions

\- Copy/paste support (Ctrl+Shift+C / Ctrl+Shift+V)

\- Scrollback buffer (configurable, default 10000 lines)

\- Search within terminal (Ctrl+F)



\*\*Shell Configuration\*\*

\- User selects preferred shell in config

\- Auto-detect Git Bash installation path

\- Fall back chain: Git Bash → cmd.exe → user-specified

\- Shell selection persisted per-project if desired



\*\*Command Injection\*\*

\- Send arbitrary text to PTY stdin

\- Commands are just strings — ACE doesn't parse or validate

\- Optional: add newline automatically (configurable)

\- Visual feedback when command is sent



\### 2. Agent System



\*\*Agent Registry\*\*

\- Agents defined in TOML files in user-specified directory

\- Each agent has: name, description, prompt text, optional hotkey, optional icon

\- Agents are project-specific or global (user choice)

\- Live reload: edit agent file, ACE picks up changes



\*\*Agent Panel UI\*\*

\- Sidebar listing all available agents

\- Click to inject agent's prompt into terminal

\- Shows bound hotkey next to each agent

\- Drag to reorder (order persisted)

\- Right-click to edit agent file (opens in default editor)

\- Visual indicator for "recently used" agents



\*\*Agent Definition Format\*\*

```toml

\# agents/researcher.toml



\[agent]

name = "Researcher"

description = "Deep research with web search focus"

hotkey = "Ctrl+1"

icon = "search"  # Built-in icon name or path to .png/.svg



\[prompt]

\# Multi-line prompt text

text = """

You are a research-focused agent. For this task:

\- Prioritize using web search for current information

\- Provide citations for all factual claims

\- Summarize findings before diving into details

\- Ask clarifying questions if the research scope is unclear

"""



\[options]

\# Optional behavioral hints (ACE doesn't enforce these, just metadata)

suggested\_tools = \["web\_search", "fetch"]

context\_notes = "Works best with compact context"

```



\### 3. MCP Server Visibility



\*\*Config Detection\*\*

\- User specifies Claude Code config location in ACE config

\- Parse MCP server definitions from config file

\- Display list of configured MCP servers



\*\*Status Display\*\*

\- Show each MCP server name

\- Show tool count per server (if parseable)

\- Connection status indicator (if detectable from terminal output)

\- Click server name to see list of tools it provides



\*\*No Direct MCP Interaction\*\*

\- ACE reads config files, it doesn't connect to MCP servers

\- Status is informational only

\- If user wants to change MCP config, they edit the file directly



\### 4. Hotkey System



\*\*Global Hotkeys\*\*

\- Work even when ACE window is focused anywhere

\- Configurable modifier keys (Ctrl, Alt, Shift, Meta)

\- Hotkeys bound to:

&nbsp; - Agents (inject prompt)

&nbsp; - Quick commands (inject command string)

&nbsp; - ACE actions (toggle panels, focus terminal, etc.)



\*\*Built-in Commands with Default Hotkeys\*\*

```

Ctrl+Shift+E    → Send "/exit" to terminal

Ctrl+Shift+C    → Send "/compact" to terminal  

Ctrl+Shift+K    → Send "/clear" to terminal

Ctrl+Shift+R    → Restart Claude Code with --resume flag

Ctrl+Shift+N    → Restart Claude Code fresh (new session)

Ctrl+Shift+L    → Toggle session log panel

Ctrl+Shift+A    → Toggle agent panel

Ctrl+Shift+F    → Focus terminal

Ctrl+1-9        → Reserved for agent hotkeys

```



\*\*Hotkey Editor\*\*

\- UI to view all hotkeys

\- Click to rebind

\- Conflict detection (warn if key already bound)

\- Reset to defaults option

\- Export/import hotkey config



\### 5. Session Logging



\*\*Capture Everything\*\*

\- All PTY stdout/stderr captured with timestamps

\- All injected commands logged with source (button, hotkey, typed)

\- Session metadata: start time, duration, project path



\*\*Storage\*\*

\- SQLite database for queryable history

\- Each session = one row with metadata

\- Full transcript stored as TEXT (or separate table for large sessions)

\- Index on timestamp, project path



\*\*Markdown Export\*\*

\- One-click export current session to .md file

\- Auto-export on session end (configurable)

\- Format:

```markdown

\# ACE Session Log

\*\*Project:\*\* /path/to/project

\*\*Started:\*\* 2025-01-15 10:30:00

\*\*Duration:\*\* 1h 23m

\*\*Shell:\*\* Git Bash



---



\## Session Transcript



\[10:30:00] $ claude

\[10:30:02] Claude Code v1.x initialized...

\[10:30:05] > USER: Help me refactor the auth module

...

```



\*\*Session Browser\*\*

\- Panel showing past sessions

\- Filter by: project, date range, search text

\- Click to view full transcript

\- "Copy for review" button — copies transcript for pasting to AI

\- Delete old sessions (with confirmation)



\### 6. Quick Commands Panel



\*\*Pre-defined Commands\*\*

\- Buttons for common Claude Code commands

\- Each button sends a specific string to terminal

\- User can add custom quick commands



\*\*Default Quick Commands\*\*

```

\[Exit]      → "/exit"

\[Compact]   → "/compact"

\[Clear]     → "/clear"

\[Help]      → "/help"

\[Cost]      → "/cost"

\[Retry]     → "/retry"

```



\*\*Custom Quick Commands\*\*

```toml

\# In ace.config.toml



\[\[quick\_commands]]

name = "Review Code"

command = "/review"

hotkey = "Ctrl+Shift+R"

icon = "eye"



\[\[quick\_commands]]

name = "Run Tests"

command = "!npm test"

icon = "play"

```



\### 7. Project Management



\*\*Project-Scoped Configuration\*\*

\- ACE looks for `ace.project.toml` in working directory

\- Project config overrides global config

\- Project-specific agents live in `./ace/agents/`



\*\*Multi-Window Support\*\*

\- Each ACE window = one project

\- Can launch multiple ACE instances

\- Each instance has independent terminal, session, state

\- Window title shows project name/path



\*\*Project Switching\*\*

\- "Open Project" dialog

\- Recent projects list

\- Remembers last window position per project



\### 8. Tool Adapter System



\*\*Abstraction Layer\*\*

\- ACE doesn't hardcode Claude Code commands

\- Tool adapter defines:

&nbsp; - How to launch the tool

&nbsp; - How to detect tool status

&nbsp; - Known commands and their strings

&nbsp; - Resume/continue flags



\*\*Claude Code Adapter (Default)\*\*

```toml

\# adapters/claude-code.toml



\[adapter]

name = "Claude Code"

launch\_command = "claude"

detect\_pattern = "Claude Code"  # String in output indicating tool is running



\[commands]

exit = "/exit"

compact = "/compact"

clear = "/clear"

help = "/help"



\[flags]

resume = "--resume"

continue = "--continue"

print\_mode = "--print"

```



\*\*Future Adapters\*\*

\- Codex CLI

\- Aider

\- Other terminal AI tools

\- User can create custom adapters



\### 9. UI/UX Specifications



\*\*Layout\*\*

\- Terminal takes 65-75% of window width

\- Sidebar (collapsible) takes remainder

\- Status bar at bottom (always visible)

\- No menu bar (use hotkeys and context menus)



\*\*Theming\*\*

\- Dark theme default (matches terminal aesthetic)

\- Theme follows terminal colorscheme where possible

\- High contrast option for accessibility

\- User-selectable accent color



\*\*Visual Principles\*\*

\- Minimal chrome — no gradients, shadows, or decoration

\- Monospace fonts throughout (consistent with terminal)

\- Icons: simple, recognizable, single-color

\- Status indicators: colored dots (green/yellow/red) or filled/unfilled circles



\*\*Responsiveness\*\*

\- Window resizable, remembers size/position

\- Minimum window size enforced (800x600)

\- Sidebar auto-collapses on narrow windows

\- Terminal reflows on resize



\### 10. Settings \& Configuration



\*\*ACE Global Config Location\*\*

\- Windows: `%APPDATA%/ace/config.toml`

\- Creates with defaults on first launch



\*\*ace.config.toml\*\*

```toml

\[general]

theme = "dark"

accent\_color = "#007acc"



\[shell]

\# Preferred shell - auto-detects if not specified

path = "C:/Program Files/Git/bin/bash.exe"

args = \["--login", "-i"]

\# Fallback if preferred shell not found

fallback = "cmd.exe"



\[terminal]

font\_family = "Cascadia Code, Consolas, monospace"

font\_size = 14

scrollback = 10000

cursor\_style = "block"  # block, underline, bar

cursor\_blink = true



\[claude\_code]

\# User must set this to their Claude Code config location

config\_path = ""  # e.g., "C:/Users/Name/.claude/"

mcp\_config = ""   # e.g., "C:/Users/Name/.claude/mcp.json"



\[logging]

enabled = true

directory = ""  # Defaults to %APPDATA%/ace/logs/

format = "markdown"  # markdown or txt

auto\_export = true   # Export on session end



\[agents]

global\_directory = ""  # Defaults to %APPDATA%/ace/agents/



\[hotkeys]

\# Override defaults here

exit = "Ctrl+Shift+E"

compact = "Ctrl+Shift+C"

\# ... etc

```



\*\*First-Run Setup\*\*

\- If `claude\_code.config\_path` is empty, show setup prompt

\- Guided wizard: "Where is your Claude Code config?"

\- Verify path exists before saving

\- Can be changed later in settings panel



\## File Structure

```

ace/

├── package.json

├── tsconfig.json

├── electron.vite.config.ts

├── .gitignore

├── README.md

├── CLAUDE.md                    # This file

│

├── resources/                   # Build resources

│   └── icon.ico

│

├── src/

│   ├── main/                    # Electron main process

│   │   ├── index.ts             # Entry point

│   │   ├── window.ts            # Window management

│   │   ├── ipc.ts               # IPC handlers

│   │   ├── terminal/

│   │   │   ├── pty.ts           # node-pty wrapper

│   │   │   ├── shell.ts         # Shell detection/config

│   │   │   └── logger.ts        # Session logging

│   │   ├── config/

│   │   │   ├── loader.ts        # TOML config loading

│   │   │   ├── agents.ts        # Agent file parsing

│   │   │   ├── adapters.ts      # Tool adapter loading

│   │   │   └── mcp.ts           # MCP config parsing

│   │   ├── storage/

│   │   │   └── database.ts      # SQLite operations

│   │   └── hotkeys/

│   │       └── manager.ts       # Global hotkey registration

│   │

│   ├── preload/                 # Electron preload scripts

│   │   └── index.ts             # Expose APIs to renderer

│   │

│   └── renderer/                # React frontend

│       ├── index.html

│       ├── main.tsx             # React entry

│       ├── App.tsx              # Root component

│       ├── components/

│       │   ├── Terminal/

│       │   │   ├── Terminal.tsx      # xterm.js wrapper

│       │   │   ├── TerminalToolbar.tsx

│       │   │   └── terminal.css

│       │   ├── Sidebar/

│       │   │   ├── Sidebar.tsx       # Container

│       │   │   ├── AgentPanel.tsx    # Agent list

│       │   │   ├── McpPanel.tsx      # MCP status

│       │   │   ├── CommandPanel.tsx  # Quick commands

│       │   │   └── SessionPanel.tsx  # Session browser

│       │   ├── StatusBar/

│       │   │   └── StatusBar.tsx

│       │   ├── Settings/

│       │   │   ├── SettingsModal.tsx

│       │   │   ├── HotkeyEditor.tsx

│       │   │   └── ConfigEditor.tsx

│       │   └── common/

│       │       ├── Button.tsx

│       │       ├── Panel.tsx

│       │       └── Icon.tsx

│       ├── hooks/

│       │   ├── useTerminal.ts

│       │   ├── useAgents.ts

│       │   ├── useHotkeys.ts

│       │   ├── useConfig.ts

│       │   └── useSession.ts

│       ├── stores/

│       │   ├── terminalStore.ts

│       │   ├── agentStore.ts

│       │   ├── sessionStore.ts

│       │   └── configStore.ts

│       ├── lib/

│       │   ├── ipc.ts           # Renderer-side IPC helpers

│       │   └── utils.ts

│       └── styles/

│           ├── global.css

│           ├── variables.css

│           └── theme.css

│

├── adapters/                    # Tool adapter definitions

│   └── claude-code.toml

│

└── default-agents/              # Ships with ACE

&nbsp;   ├── default.toml

&nbsp;   └── examples/

&nbsp;       ├── researcher.toml

&nbsp;       └── reviewer.toml

```



\## IPC Contract



Communication between main process and renderer:

```typescript

// Main → Renderer (events)

terminal:data        (data: string)           // PTY output

terminal:exit        (code: number)           // PTY closed

session:updated      (session: SessionMeta)   // Session state changed

agents:changed       ()                       // Agent files changed, reload

config:changed       ()                       // Config changed, reload



// Renderer → Main (invocations)

terminal:spawn       (shell?: string)         // Start PTY

terminal:write       (data: string)           // Write to PTY stdin

terminal:resize      (cols: number, rows: number)

terminal:kill        ()                       // Kill PTY process



config:get           ()                       // Get full config

config:set           (key: string, value: any)

config:getClaudeConfig ()                     // Get Claude Code config



agents:list          ()                       // Get all agents

agents:get           (id: string)             // Get single agent

agents:openFile      (id: string)             // Open agent file in editor



sessions:list        (filter?: SessionFilter) // Query sessions

sessions:get         (id: string)             // Get session transcript

sessions:export      (id: string, format: string)

sessions:delete      (id: string)



hotkeys:register     (id: string, combo: string)

hotkeys:unregister   (id: string)



app:getPath          (name: string)           // Get app paths

app:openExternal     (url: string)            // Open URL in browser

```



\## Development Setup

```bash

\# Prerequisites: Node.js 18+, npm or pnpm



\# Clone and install

git clone <repo>

cd ace

pnpm install



\# Run in development (hot reload)

pnpm dev



\# Build for production

pnpm build



\# Package for distribution

pnpm package



\# Run tests

pnpm test



\# Lint

pnpm lint

```



\## Implementation Order



Build in this order to maintain a working application at each step:



\### Step 1: Minimal Shell

Get Electron running with a basic window.

\- \[ ] Scaffold Electron + Vite + React project

\- \[ ] Basic window management (open, close, resize)

\- \[ ] Empty React app renders



\### Step 2: Terminal Integration

Get a working terminal.

\- \[ ] Integrate node-pty

\- \[ ] Integrate xterm.js

\- \[ ] Terminal renders and accepts input

\- \[ ] Spawn Git Bash or cmd.exe

\- \[ ] Basic resize handling



\### Step 3: Command Injection

Prove we can control the terminal.

\- \[ ] Create a simple button that sends text to PTY

\- \[ ] Add a few hardcoded quick command buttons

\- \[ ] Verify commands execute in Claude Code



\### Step 4: Configuration System

Make it user-configurable.

\- \[ ] Create config file structure

\- \[ ] TOML parsing (use `@iarna/toml` or similar)

\- \[ ] First-run setup wizard for Claude Code path

\- \[ ] Settings persist across restarts



\### Step 5: Session Logging

Never lose work.

\- \[ ] Capture all PTY output

\- \[ ] SQLite database setup

\- \[ ] Save sessions with metadata

\- \[ ] Markdown export function

\- \[ ] Basic session list view



\### Step 6: Agent System

The core value prop.

\- \[ ] Agent TOML parsing

\- \[ ] Agent panel UI (list agents)

\- \[ ] Click agent → inject prompt

\- \[ ] Agent file hot-reload (watch for changes)

\- \[ ] Ship with example agents



\### Step 7: Hotkey System

Keyboard-first interaction.

\- \[ ] Global hotkey registration (electron-globalShortcut or similar)

\- \[ ] Default hotkey bindings

\- \[ ] Hotkey editor UI

\- \[ ] Bind hotkeys to agents

\- \[ ] Bind hotkeys to quick commands



\### Step 8: MCP Visibility

Surface tool information.

\- \[ ] Parse Claude Code's MCP config

\- \[ ] MCP panel showing servers

\- \[ ] Show tool count per server

\- \[ ] Refresh when config file changes



\### Step 9: UI Polish

Make it feel good.

\- \[ ] Dark theme styling

\- \[ ] Collapsible sidebar

\- \[ ] Status bar with session info

\- \[ ] Window state persistence

\- \[ ] Keyboard navigation throughout



\### Step 10: Multi-Project

Real-world usage.

\- \[ ] Multiple windows support

\- \[ ] Project-scoped config

\- \[ ] Recent projects list

\- \[ ] Per-project agents directory



\### Step 11: Session Review

Learn from history.

\- \[ ] Session search/filter

\- \[ ] Full transcript viewer

\- \[ ] "Copy for AI review" button

\- \[ ] Session deletion with confirmation



\### Step 12: Tool Adapters

Extensibility.

\- \[ ] Abstract tool adapter interface

\- \[ ] Claude Code adapter (default)

\- \[ ] Document adapter format

\- \[ ] Adapter selection in config



\## Code Style Guidelines



\*\*General\*\*

\- Functional React components with hooks

\- Prefer composition over inheritance

\- Small, focused functions (<50 lines)

\- Explicit types, avoid `any`



\*\*Naming\*\*

\- Components: PascalCase (`AgentPanel.tsx`)

\- Hooks: camelCase with `use` prefix (`useTerminal.ts`)

\- Utilities: camelCase (`parseToml.ts`)

\- Constants: UPPER\_SNAKE\_CASE

\- IPC channels: kebab-case (`terminal:write`)



\*\*File Organization\*\*

\- One component per file

\- Colocate styles with components when possible

\- Keep main process code strictly separate from renderer



\*\*Error Handling\*\*

\- Wrap IPC calls in try/catch

\- Show user-friendly error messages

\- Log technical details to console/file

\- Never crash silently



\## Testing Strategy



\*\*Unit Tests\*\*

\- Config parsing

\- Agent TOML parsing

\- MCP config parsing

\- Utility functions



\*\*Integration Tests\*\*

\- IPC communication

\- PTY spawn and communication

\- Session storage and retrieval



\*\*Manual Testing Checklist\*\*

\- \[ ] Terminal spawns correctly with Git Bash

\- \[ ] Terminal spawns correctly with cmd.exe

\- \[ ] Commands injected appear in terminal

\- \[ ] Claude Code launches and responds

\- \[ ] Session is logged to database

\- \[ ] Session exports to markdown

\- \[ ] Hotkeys work globally

\- \[ ] Agents load from files

\- \[ ] Agent prompt injection works

\- \[ ] Config changes persist

\- \[ ] Window size persists

\- \[ ] Multiple windows work independently



\## Known Challenges \& Solutions



\*\*Challenge:\*\* Git Bash path varies by installation

\*\*Solution:\*\* Check common paths, then PATH, then ask user



\*\*Challenge:\*\* xterm.js sizing vs container sizing

\*\*Solution:\*\* Use ResizeObserver, call terminal.fit() on resize



\*\*Challenge:\*\* Global hotkeys conflict with other apps

\*\*Solution:\*\* Let user rebind, use uncommon defaults (Ctrl+Shift+...)



\*\*Challenge:\*\* Large session logs slow down UI

\*\*Solution:\*\* Paginate transcript view, lazy load sessions



\*\*Challenge:\*\* Detecting Claude Code state from output

\*\*Solution:\*\* Don't try — just surface raw terminal. User sees what Claude sees.



\## Resources \& References



\- \[node-pty documentation](https://github.com/microsoft/node-pty)

\- \[xterm.js documentation](https://xtermjs.org/docs/)

\- \[Electron documentation](https://www.electronjs.org/docs)

\- \[electron-vite](https://electron-vite.org/) — build tooling

\- \[Zustand](https://github.com/pmndrs/zustand) — state management

\- \[better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite

\- \[@iarna/toml](https://github.com/iarna/iarna-toml) — TOML parsing

\- \[VS Code terminal source](https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/terminal) — reference implementation



---



## Development Tools & MCP Servers

This section documents tools, MCP servers, and libraries to use during ACE development.


### MCP Servers (via Docker MCP Toolkit)

All MCPs are hotloaded via Docker MCP Toolkit. Key servers for this project:

| MCP Server | Usage |
|------------|-------|
| **Context7** | Get up-to-date docs for xterm.js, node-pty, electron-vite, Zustand |
| **Brave Search** | Research current best practices, troubleshoot edge cases |
| **GitHub MCP** | Manage issues, PRs, releases for ACE repository |
| **Playwright MCP** | Automated testing of Electron renderer UI |
| **Sequential Thinking** | Break down complex architectural decisions |

**Note:** Filesystem and Memory MCPs are not needed - Claude Code has native file access.


### Required xterm.js Addons

Install all of these - they're essential for a production terminal:

```bash
# Core addons (MUST HAVE)
@xterm/addon-fit          # Auto-resize terminal to container
@xterm/addon-webgl        # GPU-accelerated rendering (perf)
@xterm/addon-search       # Ctrl+F search in scrollback
@xterm/addon-web-links    # Clickable URLs in terminal
@xterm/addon-clipboard    # OSC 52 clipboard support

# Nice to have
@xterm/addon-serialize    # Export terminal state (for session logs)
@xterm/addon-unicode11    # Better emoji/unicode rendering
@xterm/addon-ligatures    # Programming font ligatures
```

**Critical patterns from xterm.js docs:**
- Always use `FitAddon` + `ResizeObserver` for sizing
- Handle `WebglAddon.onContextLoss()` - fallback to canvas renderer
- Call `terminal.loadAddon()` AFTER `terminal.open()`
- Use `terminal.options.theme` for theming, not CSS


### node-pty Notes

```javascript
// Spawn pattern for Windows
const shell = process.platform === 'win32' ? 'bash.exe' : 'bash';
const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});

// Flow control (important for large outputs)
ptyProcess.handleFlowControl = true;
```

**Git Bash detection paths (Windows):**
```
C:\Program Files\Git\bin\bash.exe
C:\Program Files (x86)\Git\bin\bash.exe
C:\Users\<user>\AppData\Local\Programs\Git\bin\bash.exe
```


### electron-vite Configuration

Use centralized config in `electron.vite.config.ts`:

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') }
      }
    }
  }
})
```


### Additional Dependencies to Consider

```bash
# Already planned
electron-vite            # Build tooling
better-sqlite3           # Session storage
@iarna/toml              # Config parsing
zustand                  # State management

# Recommended additions
chokidar                 # File watching for agent hot-reload
electron-log             # Structured logging
@electron/rebuild        # Native module rebuilding for node-pty
```


### Reference Projects

Study these for patterns:

| Project | What to Learn |
|---------|---------------|
| **[Hyper](https://github.com/vercel/hyper)** | Plugin architecture, config format, theming |
| **[electerm](https://github.com/electerm/electerm)** | xterm.js + node-pty integration, tabs, SFTP |
| **[VS Code Terminal](https://github.com/microsoft/vscode)** | Production PTY handling, resize, search |


### Known Issues & Solutions

| Issue | Solution |
|-------|----------|
| node-pty fails to build | Run `npm install --global windows-build-tools` first |
| xterm.js sizing wrong | Use `FitAddon` + `ResizeObserver`, not CSS |
| WebGL context lost | Handle `onContextLoss`, dispose addon, recreate |
| Git Bash not found | Check all common paths, fallback to cmd.exe |
| Large session logs slow | Paginate views, use virtual scrolling |


---



## Current Task



Initialize the project and complete Step 1 (Minimal Shell) and Step 2 (Terminal Integration).



Goal: An Electron window with a working terminal (xterm.js + node-pty) that spawns Git Bash or cmd.exe.



Begin by scaffolding the project structure.

