# nib — Product & Architecture Guide

## What is nib?

nib is a **desktop markdown editor** for collecting, connecting, and reorganizing short-form writing (essays, notes, snippets). Think of it as a personal "clip stack" for ideas — you write markdown files, collect inline snippets in YAML frontmatter, and drag them between documents.

It is built with **Wails v2** (Go backend + Svelte frontend), runs as a native desktop app (Linux/Windows/macOS), and presents as a frameless, VS Code-like window.

---

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Backend  | Go 1.23, Wails v2.12                            |
| Frontend | Svelte 3, Vite 3, vanilla JS                    |
| Bindings | Wails auto-generated (`frontend/wailsjs/go/`)   |
| Config   | YAML frontmatter in `.md` files, parsed via `gopkg.in/yaml.v3` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Go Desktop App (main.go → wails.Run)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App struct (app.go)                              │  │
│  │  ── Wails bindings exposed to frontend            │  │
│  │  ── Stores projectRoot context                    │  │
│  │  ── Delegates to internal/ packages               │  │
│  └──────────┬────────────────────────────────────────┘  │
│             │ calls                                     │
│  ┌──────────▼────────────────────────────────────────┐  │
│  │  internal/filesystem.go                           │  │
│  │  ── Path-safe file CRUD (OpenProject, ListEntries, │  │
│  │      ReadFile, WriteFile, CreateFile/Dir,          │  │
│  │      DeletePath, RenamePath)                       │  │
│  │  ── resolvePath() prevents directory traversal     │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  internal/frontmatter.go                           │  │
│  │  ── ParseFrontmatterFile: reads --- YAML --- body  │  │
│  │  ── WriteFrontmatterFile: serializes YAML + body   │  │
│  │  ── Add/Remove/UpdateSnippetInFile                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ Wails IPC (JSON over WebSocket)
┌──────────────────────▼──────────────────────────────────┐
│  Svelte Frontend (frontend/src/)                        │
│                                                         │
│  App.svelte — root layout (menubar + shell + context)   │
│    ├─ Menubar.svelte — File/Help menus + window ctrls   │
│    ├─ ActivityBar.svelte — icon strip (Explorer/Snippets)│
│    ├─ Side Panel (conditional on activeSidebarView)     │
│    │   ├─ FileTree.svelte — project file explorer       │
│    │   └─ SnippetsPanel.svelte — frontmatter snippet mgmt│
│    │       └─ CaptureRow.svelte — inline snippet input  │
│    ├─ Editor.svelte — textarea for file content         │
│    └─ ContextMenu.svelte — right-click actions          │
│                                                         │
│  Logic modules:                                         │
│    ├─ stores.js — Svelte writable stores (all state)    │
│    ├─ file-tree.js — file ops, tree building, API calls │
│    ├─ keybindings.js — keyboard shortcut registry       │
│    └─ path.js — path utilities (normalize, join, parent)│
└─────────────────────────────────────────────────────────┘
```

---

## Data Model: Markdown + YAML Frontmatter

Every `.md` file can have an optional frontmatter block:

```markdown
---
title: My Essay
snippets:
  - A reusable idea fragment
  - Another snippet
tags:
  - philosophy
  - draft
---

Body content here. Full markdown.
```

- Files **without** frontmatter are treated as plain text.
- Files **with** frontmatter are parsed into `FrontmatterData { title, snippets[], tags[] }` and body.
- If frontmatter fails to parse, the whole file is treated as body content (graceful degradation).

### Snippets (the core concept)

Snippets are **short text fragments** stored in YAML frontmatter. They are:
- Added via the Snippets panel (`Ctrl+I` to focus the capture input)
- Listed, expanded, and edited inline in the Snippets panel
- **Dragged** from the Snippets panel into the editor (inserts at cursor via `dataTransfer`)
- **Persistent** — dragging does NOT remove them (they are a reference library)
- Removed explicitly via the × button

This lets you collect ideas while reading/editing and wire them together later.

---

## Go Backend Bindings (app.go)

All exposed to frontend via `window.go.main.App`:

| Method                         | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| `OpenProject(path)`            | Validates & sets project root            |
| `PickProjectFolder(title)`     | Native folder picker dialog              |
| `ListEntries(path)`            | List directory contents (sorted: dirs first, alphabetically) |
| `ReadFile(path)`               | Raw file read (returns string)           |
| `WriteFile(path, content)`     | Raw file write                           |
| `CreateFile(path)`             | Create empty file (atomically, O_EXCL)   |
| `CreateDirectory(path)`        | mkdir -p                                 |
| `DeletePath(path)`             | Delete file or directory (recursively)   |
| `RenamePath(oldPath, newPath)` | Rename/move file or directory            |
| `ReadFrontmatter(path)`        | Parse YAML frontmatter → `{frontmatter, body}` |
| `WriteFrontmatter(path, data, body)` | Serialize frontmatter + body to file |
| `AddSnippet(path, text)`       | Append snippet to file's frontmatter     |
| `RemoveSnippet(path, index)`   | Remove snippet at index                  |
| `UpdateSnippet(path, index, text)` | Replace snippet at index             |

### Security

All file operations use `resolvePath()` which:
1. Resolves to absolute path
2. Computes relative path from project root
3. Rejects paths that escape the project root (`..` traversal)

---

## Frontend State (stores.js)

All application state lives in Svelte writable stores:

```
projectRoot      — currently open project folder path
folderCache      — { folderPath → Entry[] } cache for tree
expandedFolders  — list of expanded folder paths
visibleRows      — computed flat list of {entry, depth} for tree
selectedPath     — currently selected file/folder path
selectedIsDir    — whether selection is a directory
selectedContent  — content of the currently selected file
dirty            — unsaved changes flag
busy             — async operation in progress flag
statusMessage    — status bar text
contextMenu      — {x, y, entry} or null
snippets         — string[] from frontmatter of open .md file
frontmatterTitle — title field from frontmatter
frontmatterTags  — tags[] from frontmatter
activeSidebarView — 'explorer' | 'snippets' | null
sidebarWidth     — draggable panel width (persisted to localStorage)
```

---

## UI Layout

```
┌──────────────── Menubar ─────────────────┬─── window ctrls ──┐
│ nib │ File ▼ │ Help ▼ │ [status]        │ ─ ┐ ×             │
├──────┬──────────┬──────┬────────────────────────────────────┤
│      │ Side     │ drag │  Editor                           │
│ Act  │ Panel    │ handle│  (textarea, monospace font)       │
│ ivi  │ ──────── │      │                                    │
│ ty   │ Explorer │      │  Displays:                         │
│ Bar  │ or       │      │  - file content (plain text)       │
│      │ Snippets │      │  - markdown body (no rendering)    │
│      │          │      │                                    │
│      │          │      │  Drop target for snippets          │
└──────┴──────────┴──────┴────────────────────────────────────┘
```

- **Frameless window**: native title bar replaced by custom `<Menubar>` with window controls (minimize, maximize, close) using Wails runtime bindings.
- **Resizable sidebar**: drag handle between side panel and editor; arrow keys when focused.
- **Activity bar**: persistent left icon strip toggles Explorer/Snippets panels (click again to close).

---

## Keyboard Shortcuts (keybindings.js)

| Shortcut          | Action                                |
| ----------------- | ------------------------------------- |
| `Ctrl+Tab`        | Cycle side panel views forward        |
| `Ctrl+Shift+Tab`  | Cycle side panel views backward       |
| `Ctrl+I`          | Open Snippets panel, focus capture    |
| `Ctrl+S`          | Save current file                     |
| `Ctrl+O`          | Open project folder picker            |
| `Escape`          | Close context menu                    |
| `F2`              | Rename selected path                  |
| `Delete`          | Delete selected path                  |

---

## Keybindings Architecture

- Single `keybindings.js` with a `Map<string, handler>` registry.
- `matchMods(event, combo)` parses combo strings like `"ctrl+s"`, `"ctrl+shift+tab"`.
- Registered in `App.svelte` via `on:keydown={onKeydown}` on `<svelte:window>`.
- Input elements (textarea, input) only intercept modifier combos + Escape/F2/Delete — normal typing passes through.

---

## Build & Dev Commands

```bash
wails dev        # Live development (Vite HMR + Go backend)
wails build      # Production build
cd frontend && npm run build   # Frontend-only build
cd frontend && npm run dev     # Frontend-only Vite dev server
```

---

## File Layout Summary

```
nib/
├── main.go                     # Wails app entry, window config
├── app.go                      # App struct with all Go bindings
├── go.mod                      # Go module (nib)
├── wails.json                  # Wails project config
├── internal/
│   ├── filesystem.go           # Path-safe file/dir CRUD
│   └── frontmatter.go          # YAML frontmatter parser/writer
├── frontend/
│   ├── index.html              # SPA entry
│   ├── package.json            # Svelte + Vite deps
│   ├── vite.config.js          # Vite config (Svelte plugin)
│   └── src/
│       ├── main.js             # Svelte mount
│       ├── App.svelte          # Root component
│       ├── style.css           # All styles (no CSS framework)
│       ├── lib/
│       │   ├── stores.js       # All Svelte writable stores
│       │   ├── file-tree.js    # File ops, tree logic, API calls
│       │   ├── keybindings.js  # Keyboard shortcut registry
│       │   ├── path.js         # Path utilities
│       │   ├── Menubar.svelte
│       │   ├── ActivityBar.svelte
│       │   ├── FileTree.svelte
│       │   ├── SnippetsPanel.svelte
│       │   ├── CaptureRow.svelte
│       │   ├── Editor.svelte
│       │   └── ContextMenu.svelte
│       └── assets/
├── wailsjs/                    # Generated — DO NOT EDIT
│   └── go/main/App.js          # Auto-generated Go bindings
└── build/                      # Wails build artifacts
```

---

## Design Philosophy (for future contributors)

1. **Markdown stays plain** — no rendered preview, no WYSIWYG. The editor is a textarea. Rich rendering is deliberately deferred.
2. **Snippets are the differentiator** — frontmatter-stored, reusable, draggable text fragments. They make nib a "clip stack" not just another editor.
3. **Project-oriented** — you open a folder, not individual files. The file tree is the primary navigation.
4. **Path safety first** — all file operations resolve against project root to prevent path traversal.
5. **No framework on frontend beyond Svelte** — no Tailwind, no UI library. All styles are hand-written in `style.css`.
6. **Generated files are sacred** — `frontend/wailsjs/` is read-only. Never edit by hand.
