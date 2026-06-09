<script>
  const ROOT_FOLDER = ''

  let projectRoot = ''
  let folderCache = {}
  let expandedFolders = [ROOT_FOLDER]
  let visibleRows = []
  let selectedPath = ''
  let selectedIsDir = false
  let selectedContent = ''
  let dirty = false
  let busy = false
  let statusMessage = 'Open a project to start.'
  let contextMenu = null

  function appApi() {
    return window?.go?.main?.App
  }

  function ensureAppApi() {
    const api = appApi()

    if (!api) {
      throw new Error('Wails bindings are not ready yet')
    }

    return api
  }

  function normalizePath(path) {
    return (path || '').replace(/\\/g, '/')
  }

  function joinPath(...segments) {
    return normalizePath(segments.filter(Boolean).join('/')).replace(/\/+/g, '/')
  }

  function parentPath(path) {
    const normalized = normalizePath(path)
    const slashIndex = normalized.lastIndexOf('/')
    return slashIndex > 0 ? normalized.slice(0, slashIndex) : ''
  }

  function pathIsUnderPath(path, rootPath) {
    return path === rootPath || path.startsWith(`${rootPath}/`)
  }

  function rewritePath(path, oldRoot, newRoot) {
    if (!pathIsUnderPath(path, oldRoot)) {
      return path
    }

    return newRoot + path.slice(oldRoot.length)
  }

  function isExpanded(path) {
    return expandedFolders.includes(path)
  }

  function targetFolderPath() {
    if (!selectedPath) {
      return ROOT_FOLDER
    }

    return selectedIsDir ? selectedPath : parentPath(selectedPath)
  }

  function resetWorkspaceState() {
    folderCache = {}
    expandedFolders = [ROOT_FOLDER]
    visibleRows = []
    selectedPath = ''
    selectedIsDir = false
    selectedContent = ''
    dirty = false
    hideContextMenu()
  }

  function setFolderCache(folderPath, entries) {
    folderCache = {
      ...folderCache,
      [folderPath]: entries,
    }
  }

  async function loadFolder(folderPath) {
    const normalizedPath = normalizePath(folderPath)

    if (folderCache[normalizedPath]) {
      return folderCache[normalizedPath]
    }

    const entries = await ensureAppApi().ListEntries(normalizedPath)
    setFolderCache(normalizedPath, entries)
    return entries
  }

  function rebuildVisibleRows() {
    const rows = []

    function appendRows(folderPath, depth) {
      const entries = folderCache[folderPath] || []

      for (const entry of entries) {
        rows.push({
          entry,
          depth,
        })

        if (entry.isDir && isExpanded(entry.path)) {
          appendRows(entry.path, depth + 1)
        }
      }
    }

    if (projectRoot) {
      appendRows(ROOT_FOLDER, 0)
    }

    visibleRows = rows
  }

  async function refreshTree() {
    const foldersToLoad = [ROOT_FOLDER, ...expandedFolders.filter(folderPath => folderPath !== ROOT_FOLDER)]

    folderCache = {}

    for (const folderPath of foldersToLoad) {
      await loadFolder(folderPath)
    }

    rebuildVisibleRows()
  }

  function selectEntry(entry) {
    selectedPath = entry.path
    selectedIsDir = entry.isDir
    hideContextMenu()
  }

  function clearSelectionIfPathWasRemoved(removedPath) {
    if (selectedPath === removedPath || pathIsUnderPath(selectedPath, removedPath)) {
      selectedPath = ''
      selectedIsDir = false
      selectedContent = ''
      dirty = false
    }
  }

  function remapStatePaths(oldPath, newPath) {
    expandedFolders = expandedFolders.map(folderPath => rewritePath(folderPath, oldPath, newPath))

    if (selectedPath) {
      selectedPath = rewritePath(selectedPath, oldPath, newPath)
    }
  }

  async function openProjectFromPicker() {
    busy = true

    try {
      const folderPath = await ensureAppApi().PickProjectFolder('Open Project')

      if (!folderPath) {
        statusMessage = 'Open project cancelled.'
        return
      }

      projectRoot = await ensureAppApi().OpenProject(folderPath)
      resetWorkspaceState()
      await refreshTree()
      statusMessage = `Opened project: ${projectRoot}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function createProjectFromPicker() {
    busy = true

    try {
      const parentFolder = await ensureAppApi().PickProjectFolder('Choose a folder for the new project')

      if (!parentFolder) {
        statusMessage = 'New project cancelled.'
        return
      }

      const projectName = window.prompt('Project name', 'micro-essays')?.trim()

      if (!projectName) {
        statusMessage = 'New project cancelled.'
        return
      }

      projectRoot = await ensureAppApi().CreateProject(joinPath(parentFolder, projectName))
      resetWorkspaceState()
      await refreshTree()
      statusMessage = `Created project: ${projectRoot}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function openEntry(entry) {
    selectEntry(entry)

    if (entry.isDir) {
      busy = true

      try {
        if (isExpanded(entry.path)) {
          expandedFolders = expandedFolders.filter(folderPath => folderPath !== entry.path && !folderPath.startsWith(`${entry.path}/`))
        } else {
          await loadFolder(entry.path)
          expandedFolders = [...expandedFolders, entry.path]
        }

        rebuildVisibleRows()
      } catch (error) {
        statusMessage = error?.message || String(error)
      } finally {
        busy = false
      }

      return
    }

    busy = true

    try {
      selectedContent = await ensureAppApi().ReadFile(entry.path)
      dirty = false
      statusMessage = `Editing ${entry.path}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function saveFile() {
    if (!selectedPath || selectedIsDir) {
      return
    }

    busy = true

    try {
      await ensureAppApi().WriteFile(selectedPath, selectedContent)
      dirty = false
      statusMessage = `Saved ${selectedPath}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function createFile(targetFolder = targetFolderPath()) {
    if (!projectRoot) {
      statusMessage = 'Open a project first.'
      return
    }

    const defaultPath = joinPath(targetFolder, 'new-note.md')
    const filePath = window.prompt('Create file', defaultPath)?.trim()

    if (!filePath) {
      return
    }

    busy = true

    try {
      await ensureAppApi().CreateFile(filePath)
      await refreshTree()
      selectedPath = filePath
      selectedIsDir = false
      selectedContent = ''
      dirty = false
      statusMessage = `Created ${filePath}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function createFolder(targetFolder = targetFolderPath()) {
    if (!projectRoot) {
      statusMessage = 'Open a project first.'
      return
    }

    const defaultPath = joinPath(targetFolder, 'new-folder')
    const folderPath = window.prompt('Create folder', defaultPath)?.trim()

    if (!folderPath) {
      return
    }

    busy = true

    try {
      await ensureAppApi().CreateDirectory(folderPath)
      await refreshTree()
      statusMessage = `Created ${folderPath}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function renamePath(path = selectedPath) {
    if (!path) {
      return
    }

    const newPath = window.prompt('Rename path', path)?.trim()

    if (!newPath || newPath === path) {
      return
    }

    busy = true

    try {
      await ensureAppApi().RenamePath(path, newPath)
      remapStatePaths(path, newPath)
      await refreshTree()
      statusMessage = `Renamed ${path}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  async function deletePath(path = selectedPath) {
    if (!path) {
      return
    }

    const confirmed = window.confirm(`Delete ${path}?`)

    if (!confirmed) {
      return
    }

    busy = true

    try {
      await ensureAppApi().DeletePath(path)
      expandedFolders = expandedFolders.filter(folderPath => !pathIsUnderPath(folderPath, path))
      clearSelectionIfPathWasRemoved(path)
      await refreshTree()
      statusMessage = `Deleted ${path}`
    } catch (error) {
      statusMessage = error?.message || String(error)
    } finally {
      busy = false
    }
  }

  function showContextMenu(event, entry) {
    event.preventDefault()
    event.stopPropagation()
    selectEntry(entry)
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      entry,
    }
  }

  function hideContextMenu() {
    contextMenu = null
  }

  function openContextAction(action) {
    if (!contextMenu) {
      return
    }

    const { entry } = contextMenu
    hideContextMenu()

    if (action === 'open') {
      openEntry(entry)
      return
    }

    if (action === 'new-file') {
      createFile(entry.isDir ? entry.path : parentPath(entry.path))
      return
    }

    if (action === 'new-folder') {
      createFolder(entry.isDir ? entry.path : parentPath(entry.path))
      return
    }

    if (action === 'rename') {
      renamePath(entry.path)
      return
    }

    if (action === 'delete') {
      deletePath(entry.path)
    }
  }

  function handleWindowKeydown(event) {
    if (event.key === 'Escape') {
      hideContextMenu()
      return
    }

    if (!projectRoot) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        openProjectFromPicker()
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        createProjectFromPicker()
      }

      return
    }

    if (event.key === 'F2' && selectedPath) {
      event.preventDefault()
      renamePath()
      return
    }

    if (event.key === 'Delete' && selectedPath) {
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

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      createProjectFromPicker()
    }
  }

  function rowClass(entry) {
    return [
      'tree-row',
      entry.isDir ? 'is-dir' : 'is-file',
      selectedPath === entry.path ? 'is-selected' : '',
      isExpanded(entry.path) ? 'is-open' : '',
    ].join(' ')
  }
</script>

<svelte:window on:click={hideContextMenu} on:keydown={handleWindowKeydown} on:resize={hideContextMenu} />

<div class="workspace">
  <header class="menubar">
    <div class="app-name">nib</div>

    <div class="menu-group">
      <button class="menu-button" disabled={busy} on:click={openProjectFromPicker} type="button">Open Project</button>
      <button class="menu-button" disabled={busy} on:click={createProjectFromPicker} type="button">New Project</button>
      <button class="menu-button" disabled={busy || !projectRoot} on:click={() => createFile()} type="button">New File</button>
      <button class="menu-button" disabled={busy || !projectRoot} on:click={() => createFolder()} type="button">New Folder</button>
      <button class="menu-button" disabled={busy || !selectedPath || selectedIsDir || !dirty} on:click={saveFile} type="button">Save</button>
    </div>

    <div class="menu-status">{projectRoot || 'No project open'}</div>
  </header>

  <main class="shell">
    <aside class="sidebar">
      <section class="explorer-panel">
        <div class="explorer-header">
          <div>
            <div class="panel-title">Explorer</div>
            <div class="project-path">{projectRoot || 'Open a folder to begin'}</div>
          </div>

          <div class="explorer-actions">
            <button class="menu-button compact" disabled={!projectRoot || busy} on:click={() => createFile()} type="button">+ File</button>
            <button class="menu-button compact" disabled={!projectRoot || busy} on:click={() => createFolder()} type="button">+ Folder</button>
          </div>
        </div>

        <div class="tree-body" on:contextmenu|preventDefault>
          {#if visibleRows.length > 0}
            {#each visibleRows as row (row.entry.path)}
              <div
                class={rowClass(row.entry)}
                on:click={() => openEntry(row.entry)}
                on:keydown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openEntry(row.entry)
                  }
                }}
                on:contextmenu={(event) => showContextMenu(event, row.entry)}
                style={`padding-left: ${0.6 + row.depth * 1.05}rem`}
                role="button"
                tabindex="0"
              >
                <span class="tree-glyph">{row.entry.isDir ? (isExpanded(row.entry.path) ? '▾' : '▸') : '•'}</span>
                <span class="tree-name">{row.entry.name}</span>
              </div>
            {/each}
          {:else}
            <div class="empty-tree">
              {#if projectRoot}
                Right click the explorer or use the top bar to create files and folders.
              {:else}
                Open a project folder to see the file tree.
              {/if}
            </div>
          {/if}
        </div>
      </section>
    </aside>

    <section class="editor-shell">
      <header class="editor-header">
        <div>
          <div class="panel-title">Editor</div>
          <div class="editor-path">
            {#if selectedPath}
              {selectedPath}
            {:else}
              No file selected
            {/if}
          </div>
        </div>

        <div class="editor-actions">
          <button class="menu-button compact" disabled={busy || !selectedPath || selectedIsDir} on:click={saveFile} type="button">Save</button>
        </div>
      </header>

      <div class="editor-status">
        <span class:dirty={dirty}>{dirty ? 'Unsaved changes' : 'Ready'}</span>
        <span>{statusMessage}</span>
      </div>

      {#if selectedPath && !selectedIsDir}
        <textarea
          bind:value={selectedContent}
          class="editor"
          on:input={() => {
            dirty = true
          }}
          placeholder="Write markdown here..."
          spellcheck="true"
        />
      {:else}
        <div class="editor-empty">
          {#if selectedIsDir}
            This is a folder. Pick a file to edit, or use the menu to create a file here.
          {:else}
            Pick a text file from the explorer. Markdown stays plain for now, ready for a richer editor later.
          {/if}
        </div>
      {/if}
    </section>
  </main>

  {#if contextMenu}
    <div
      class="context-menu"
      on:contextmenu|preventDefault
      style={`left: ${contextMenu.x}px; top: ${contextMenu.y}px`}
    >
      <button class="context-item" on:click={() => openContextAction('open')} type="button">Open</button>
      <button class="context-item" on:click={() => openContextAction('new-file')} type="button">New File Here</button>
      <button class="context-item" on:click={() => openContextAction('new-folder')} type="button">New Folder Here</button>
      <button class="context-item" on:click={() => openContextAction('rename')} type="button">Rename</button>
      <button class="context-item danger" on:click={() => openContextAction('delete')} type="button">Delete</button>
    </div>
  {/if}
</div>