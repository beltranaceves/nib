import { writable, get } from 'svelte/store'

// ── Path constants ──
export const ROOT_FOLDER = ''

// ── Writable stores ──
export const projectRoot = writable('')
export const folderCache = writable({})
export const expandedFolders = writable([ROOT_FOLDER])
export const visibleRows = writable([])
export const selectedPath = writable('')
export const selectedIsDir = writable(false)
export const selectedContent = writable('')
export const dirty = writable(false)
export const busy = writable(false)
export const statusMessage = writable('Open a project to start.')
export const contextMenu = writable(null)

// ── Active sidebar view ──
// Which panel is shown in the side panel: 'explorer' | 'blank' | null
export const activeSidebarView = writable('explorer')

// ── Layout ──
const savedWidth = typeof localStorage !== 'undefined'
  ? parseInt(localStorage.getItem('nib:sidebarWidth') || '300', 10)
  : 300
export const sidebarWidth = writable(Math.max(200, Math.min(600, savedWidth)))
sidebarWidth.subscribe(val => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nib:sidebarWidth', String(val))
  }
})

// ── Path utilities ──
export function normalizePath(path) {
  return (path || '').replace(/\\/g, '/')
}

export function joinPath(...segments) {
  return normalizePath(segments.filter(Boolean).join('/')).replace(/\/+/g, '/')
}

export function parentPath(path) {
  const normalized = normalizePath(path)
  const slashIndex = normalized.lastIndexOf('/')
  return slashIndex > 0 ? normalized.slice(0, slashIndex) : ''
}

export function pathIsUnderPath(path, rootPath) {
  return path === rootPath || path.startsWith(`${rootPath}/`)
}

export function rewritePath(path, oldRoot, newRoot) {
  if (!pathIsUnderPath(path, oldRoot)) return path
  return newRoot + path.slice(oldRoot.length)
}

// ── API helpers ──
function appApi() {
  return window?.go?.main?.App
}

function ensureAppApi() {
  const api = appApi()
  if (!api) throw new Error('Wails bindings are not ready yet')
  return api
}

// ── Derived helpers ──
export function isExpanded(path) {
  return get(expandedFolders).includes(path)
}

export function targetFolderPath() {
  const selPath = get(selectedPath)
  const selIsDir = get(selectedIsDir)
  if (!selPath) return ROOT_FOLDER
  return selIsDir ? selPath : parentPath(selPath)
}

// ── State reset ──
export function resetWorkspaceState() {
  folderCache.set({})
  expandedFolders.set([ROOT_FOLDER])
  visibleRows.set([])
  selectedPath.set('')
  selectedIsDir.set(false)
  selectedContent.set('')
  dirty.set(false)
  hideContextMenu()
}

function setFolderCache(folderPath, entries) {
  folderCache.update(cache => ({ ...cache, [folderPath]: entries }))
}

// ── File tree operations ──
export async function loadFolder(folderPath) {
  const normalized = normalizePath(folderPath)
  const cache = get(folderCache)
  if (cache[normalized]) return cache[normalized]
  const entries = await ensureAppApi().ListEntries(normalized)
  setFolderCache(normalized, entries)
  return entries
}

export function rebuildVisibleRows() {
  const cache = get(folderCache)
  const expanded = get(expandedFolders)
  const root = get(projectRoot)
  const rows = []

  function appendRows(folderPath, depth) {
    const entries = cache[folderPath] || []
    for (const entry of entries) {
      rows.push({ entry, depth })
      if (entry.isDir && expanded.includes(entry.path)) {
        appendRows(entry.path, depth + 1)
      }
    }
  }

  if (root) appendRows(ROOT_FOLDER, 0)
  visibleRows.set(rows)
}

export async function refreshTree() {
  const expanded = get(expandedFolders)
  const toLoad = [ROOT_FOLDER, ...expanded.filter(f => f !== ROOT_FOLDER)]
  folderCache.set({})
  for (const folderPath of toLoad) {
    await loadFolder(folderPath)
  }
  rebuildVisibleRows()
}

function selectEntry(entry) {
  selectedPath.set(entry.path)
  selectedIsDir.set(entry.isDir)
  hideContextMenu()
}

function clearSelectionIfPathWasRemoved(removedPath) {
  const selPath = get(selectedPath)
  if (selPath === removedPath || pathIsUnderPath(selPath, removedPath)) {
    selectedPath.set('')
    selectedIsDir.set(false)
    selectedContent.set('')
    dirty.set(false)
  }
}

function remapStatePaths(oldPath, newPath) {
  expandedFolders.update(expanded =>
    expanded.map(f => rewritePath(f, oldPath, newPath))
  )
  selectedPath.update(sp => (sp ? rewritePath(sp, oldPath, newPath) : sp))
}

// ── User actions ──
export async function openProjectFromPicker() {
  busy.set(true)
  try {
    const folderPath = await ensureAppApi().PickProjectFolder('Open Project')
    if (!folderPath) {
      statusMessage.set('Open project cancelled.')
      return
    }
    const root = await ensureAppApi().OpenProject(folderPath)
    projectRoot.set(root)
    resetWorkspaceState()
    await refreshTree()
    statusMessage.set(`Opened project: ${root}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function createProjectFromPicker() {
  busy.set(true)
  try {
    const parentFolder = await ensureAppApi().PickProjectFolder(
      'Choose a folder for the new project'
    )
    if (!parentFolder) {
      statusMessage.set('New project cancelled.')
      return
    }
    const projectName = window.prompt('Project name', 'micro-essays')?.trim()
    if (!projectName) {
      statusMessage.set('New project cancelled.')
      return
    }
    const root = await ensureAppApi().CreateProject(
      joinPath(parentFolder, projectName)
    )
    projectRoot.set(root)
    resetWorkspaceState()
    await refreshTree()
    statusMessage.set(`Created project: ${root}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function openEntry(entry) {
  selectEntry(entry)

  if (entry.isDir) {
    busy.set(true)
    try {
      if (get(expandedFolders).includes(entry.path)) {
        expandedFolders.update(expanded =>
          expanded.filter(
            f => f !== entry.path && !f.startsWith(`${entry.path}/`)
          )
        )
      } else {
        await loadFolder(entry.path)
        expandedFolders.update(expanded => [...expanded, entry.path])
      }
      rebuildVisibleRows()
    } catch (error) {
      statusMessage.set(error?.message || String(error))
    } finally {
      busy.set(false)
    }
    return
  }

  busy.set(true)
  try {
    selectedContent.set(await ensureAppApi().ReadFile(entry.path))
    dirty.set(false)
    statusMessage.set(`Editing ${entry.path}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function saveFile() {
  const selPath = get(selectedPath)
  const selIsDir = get(selectedIsDir)
  if (!selPath || selIsDir) return

  busy.set(true)
  try {
    await ensureAppApi().WriteFile(selPath, get(selectedContent))
    dirty.set(false)
    statusMessage.set(`Saved ${selPath}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function createFile(targetFolder) {
  if (!get(projectRoot)) {
    statusMessage.set('Open a project first.')
    return
  }
  const defaultPath = joinPath(
    targetFolder ?? targetFolderPath(),
    'new-note.md'
  )
  const filePath = window.prompt('Create file', defaultPath)?.trim()
  if (!filePath) return

  busy.set(true)
  try {
    await ensureAppApi().CreateFile(filePath)
    await refreshTree()
    selectedPath.set(filePath)
    selectedIsDir.set(false)
    selectedContent.set('')
    dirty.set(false)
    statusMessage.set(`Created ${filePath}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function createFolder(targetFolder) {
  if (!get(projectRoot)) {
    statusMessage.set('Open a project first.')
    return
  }
  const defaultPath = joinPath(
    targetFolder ?? targetFolderPath(),
    'new-folder'
  )
  const folderPath = window.prompt('Create folder', defaultPath)?.trim()
  if (!folderPath) return

  busy.set(true)
  try {
    await ensureAppApi().CreateDirectory(folderPath)
    await refreshTree()
    statusMessage.set(`Created ${folderPath}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function renamePath(path) {
  if (!path) return
  const newPath = window.prompt('Rename path', path)?.trim()
  if (!newPath || newPath === path) return

  busy.set(true)
  try {
    await ensureAppApi().RenamePath(path, newPath)
    remapStatePaths(path, newPath)
    await refreshTree()
    statusMessage.set(`Renamed ${path}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

export async function deletePath(path) {
  if (!path) return
  const confirmed = window.confirm(`Delete ${path}?`)
  if (!confirmed) return

  busy.set(true)
  try {
    await ensureAppApi().DeletePath(path)
    expandedFolders.update(expanded =>
      expanded.filter(f => !pathIsUnderPath(f, path))
    )
    clearSelectionIfPathWasRemoved(path)
    await refreshTree()
    statusMessage.set(`Deleted ${path}`)
  } catch (error) {
    statusMessage.set(error?.message || String(error))
  } finally {
    busy.set(false)
  }
}

// ── Context menu ──
export function showContextMenu(event, entry) {
  event.preventDefault()
  event.stopPropagation()
  selectEntry(entry)
  contextMenu.set({ x: event.clientX, y: event.clientY, entry })
}

export function hideContextMenu() {
  contextMenu.set(null)
}

export function openContextAction(action) {
  const menu = get(contextMenu)
  if (!menu) return
  const { entry } = menu
  hideContextMenu()

  if (action === 'open') {
    openEntry(entry)
  } else if (action === 'new-file') {
    createFile(entry.isDir ? entry.path : parentPath(entry.path))
  } else if (action === 'new-folder') {
    createFolder(entry.isDir ? entry.path : parentPath(entry.path))
  } else if (action === 'rename') {
    renamePath(entry.path)
  } else if (action === 'delete') {
    deletePath(entry.path)
  }
}

// ── Global keyboard handler ──
export function handleWindowKeydown(event) {
  if (event.key === 'Escape') {
    hideContextMenu()
    return
  }

  const root = get(projectRoot)
  if (!root) {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'o'
    ) {
      event.preventDefault()
      openProjectFromPicker()
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === 'n'
    ) {
      event.preventDefault()
      createProjectFromPicker()
    }
    return
  }

  const selPath = get(selectedPath)
  if (event.key === 'F2' && selPath) {
    event.preventDefault()
    renamePath()
    return
  }
  if (event.key === 'Delete' && selPath) {
    event.preventDefault()
    deletePath()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    saveFile()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
    event.preventDefault()
    openProjectFromPicker()
    return
  }
  if (
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === 'n'
  ) {
    event.preventDefault()
    createProjectFromPicker()
    return
  }
}
