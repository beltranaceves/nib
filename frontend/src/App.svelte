<script>
  import { sidebarWidth, activeSidebarView } from './lib/stores.js'
  import { hideContextMenu } from './lib/file-tree.js'
  import { handleKeydown } from './lib/keybindings.js'
  import Menubar from './lib/Menubar.svelte'
  import ActivityBar from './lib/ActivityBar.svelte'
  import FileTree from './lib/FileTree.svelte'
  import SnippetsPanel from './lib/SnippetsPanel.svelte'
  import Editor from './lib/Editor.svelte'
  import ContextMenu from './lib/ContextMenu.svelte'

  let dragging = false

  /** @param {MouseEvent} event */
  function onDragStart(event) {
    dragging = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd)
    event.preventDefault()
  }

  /** @param {MouseEvent} event */
  function onDragMove(event) {
    if (!dragging) return
    const newWidth = Math.max(200, Math.min(600, event.clientX))
    sidebarWidth.set(newWidth)
  }

  function onDragEnd() {
    if (dragging) {
      dragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onDragMove)
      window.removeEventListener('mouseup', onDragEnd)
    }
  }

  function onKeydown(event) {
    // Only intercept modifier combos and navigation keys when typing.
    if (event.target?.closest('.cm-editor') || event.target?.tagName === 'TEXTAREA' || event.target?.tagName === 'INPUT') {
      if (
        !event.ctrlKey && !event.metaKey &&
        event.key !== 'Escape' && event.key !== 'F2' && event.key !== 'Delete'
      ) {
        return
      }
    }
    handleKeydown(event)
  }
</script>

<svelte:window
  on:click={hideContextMenu}
  on:keydown={onKeydown}
  on:resize={hideContextMenu}
/>

<div class="workspace">
  <Menubar />
  <main class="shell">
    <ActivityBar />
    {#if $activeSidebarView}
      <div class="side-panel" style="width: {$sidebarWidth}px">
        {#if $activeSidebarView === 'explorer'}
          <FileTree />
        {:else if $activeSidebarView === 'snippets'}
          <SnippetsPanel />
        {:else}
          <div class="blank-view"><span>Blank panel</span></div>
        {/if}
      </div>
      <div
        class="drag-handle"
        on:mousedown={onDragStart}
        role="separator"
        tabindex="-1"
        on:keydown={(e) => {
          const step = e.shiftKey ? 20 : 5
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            sidebarWidth.update(w => Math.max(200, w - step))
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            sidebarWidth.update(w => Math.min(600, w + step))
          }
        }}
      />
    {/if}
    <Editor />
  </main>
  <ContextMenu />
</div>