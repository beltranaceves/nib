<script>
  import {
    projectRoot,
    visibleRows,
    selectedPath,
    expandedFolders,
    busy,
  } from './stores.js'
  import {
    openEntry,
    showContextMenu,
    createFile,
    createFolder,
  } from './stores.js'

  function rowClass(entry) {
    return [
      'tree-row',
      entry.isDir ? 'is-dir' : 'is-file',
      $selectedPath === entry.path ? 'is-selected' : '',
      $expandedFolders.includes(entry.path) ? 'is-open' : '',
    ].join(' ')
  }
</script>

<aside class="sidebar">
  <section class="explorer-panel">
    <div class="explorer-header">
      <div>
        <div class="panel-title">Explorer</div>
        <div class="project-path">
          {$projectRoot || 'Open a folder to begin'}
        </div>
      </div>

      <div class="explorer-actions">
        <button
          class="menu-button compact"
          disabled={!$projectRoot || $busy}
          on:click={() => createFile()}
          type="button"
        >
          + File
        </button>
        <button
          class="menu-button compact"
          disabled={!$projectRoot || $busy}
          on:click={() => createFolder()}
          type="button"
        >
          + Folder
        </button>
      </div>
    </div>

    <div class="tree-body" on:contextmenu|preventDefault>
      {#if $visibleRows.length > 0}
        {#each $visibleRows as row (row.entry.path)}
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
            <span class="tree-glyph"
              >{row.entry.isDir
                ? $expandedFolders.includes(row.entry.path)
                  ? '▾'
                  : '▸'
                : '•'}</span
            >
            <span class="tree-name">{row.entry.name}</span>
          </div>
        {/each}
      {:else}
        <div class="empty-tree">
          {#if $projectRoot}
            Right click the explorer or use the top bar to create files and
            folders.
          {:else}
            Open a project folder to see the file tree.
          {/if}
        </div>
      {/if}
    </div>
  </section>
</aside>
