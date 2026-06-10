import { get } from 'svelte/store'
import {
  projectRoot,
  folderCache,
  expandedFolders,
  visibleRows,
  selectedPath,
  selectedIsDir,
  selectedContent,
  dirty,
  busy,
  statusMessage,
  contextMenu,
  snippets,
  frontmatterTitle,
  frontmatterTags,
} from './stores.js'
import { ROOT_FOLDER, normalizePath, joinPath, parentPath, pathIsUnderPath, rewritePath } from './path.js'


// ── API helpers ──
function appApi() {
  /** @type {any} */
  const w = window
  return w?.go?.main?.App
}

function ensureAppApi() {
  const api = appApi()
  if (!api) throw new Error('Wails bindings are not ready yet')
  return api
}

// ── Derived helpers ──

/** @param {string} path */
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
  snippets.set([])
  frontmatterTitle.set('')
  frontmatterTags.set([])
  hideContextMenu()
}

/** @param {string} folderPath @param {Entry[]} entries */
function setFolderCache(folderPath, entries) {
  folderCache.update(cache => ({ ...cache, [folderPath]: entries }))
}

// ── File tree operations ──

/** @param {string} folderPath */
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
  /** @type {Array<{entry: Entry, depth: number}>} */
  const rows = []

  /** @param {string} folderPath @param {number} depth */
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

/** @param {Entry} entry */
function selectEntry(entry) {
  selectedPath.set(entry.path)
  selectedIsDir.set(entry.isDir)
  hideContextMenu()
}

/** @param {string} removedPath */
function clearSelectionIfPathWasRemoved(removedPath) {
  const selPath = get(selectedPath)
  if (selPath === removedPath || pathIsUnderPath(selPath, removedPath)) {
    selectedPath.set('')
    selectedIsDir.set(false)
    selectedContent.set('')
    dirty.set(false)
  }
}

/** @param {string} oldPath @param {string} newPath */
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
    statusMessage.set(String(error))
  } finally {
    busy.set(false)
  }
}

/** @param {Entry} entry */
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
      statusMessage.set(String(error))
    } finally {
      busy.set(false)
    }
    return
  }

  busy.set(true)
  try {
    const isMd = entry.path.endsWith('.md') || entry.path.endsWith('.markdown')

    if (isMd) {
      try {
        const result = await ensureAppApi().ReadFrontmatter(entry.path)
        if (result && result.frontmatter) {
          snippets.set(result.frontmatter.snippets || [])
          frontmatterTitle.set(result.frontmatter.title || '')
          frontmatterTags.set(result.frontmatter.tags || [])
          selectedContent.set(result.body || '')
        } else {
          snippets.set([]); frontmatterTitle.set(''); frontmatterTags.set([])
          selectedContent.set(await ensureAppApi().ReadFile(entry.path))
        }
      } catch {
        snippets.set([]); frontmatterTitle.set(''); frontmatterTags.set([])
        selectedContent.set(await ensureAppApi().ReadFile(entry.path))
      }
    } else {
      snippets.set([]); frontmatterTitle.set(''); frontmatterTags.set([])
      selectedContent.set(await ensureAppApi().ReadFile(entry.path))
    }

    dirty.set(false)
    statusMessage.set(`Editing ${entry.path}`)
  } catch (error) {
    statusMessage.set(String(error))
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
    const isMd = selPath.endsWith('.md') || selPath.endsWith('.markdown')

    if (isMd) {
      await ensureAppApi().WriteFrontmatter(
        selPath,
        {
          title: get(frontmatterTitle),
          snippets: get(snippets),
          tags: get(frontmatterTags),
        },
        get(selectedContent),
      )
    } else {
      await ensureAppApi().WriteFile(selPath, get(selectedContent))
    }

    dirty.set(false)
    statusMessage.set(`Saved ${selPath}`)
  } catch (error) {
    statusMessage.set(String(error))
  } finally {
    busy.set(false)
  }
}

/** @param {string} [targetFolder] */
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
    statusMessage.set(String(error))
  } finally {
    busy.set(false)
  }
}

/** @param {string} [targetFolder] */
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
    statusMessage.set(String(error))
  } finally {
    busy.set(false)
  }
}

/** @param {string} path */
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
    statusMessage.set(String(error))
  } finally {
    busy.set(false)
  }
}

/** @param {string} path */
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
    statusMessage.set(String(error))
  } finally {
    busy.set(false)
  }
}

// ── Context menu ──

/** @param {MouseEvent} event @param {Entry} entry */
export function showContextMenu(event, entry) {
  event.preventDefault()
  event.stopPropagation()
  selectEntry(entry)
  contextMenu.set({ x: event.clientX, y: event.clientY, entry })
}

export function hideContextMenu() {
  contextMenu.set(null)
}

/** @param {string} action */
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


