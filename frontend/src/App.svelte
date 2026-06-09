<script>
  import {
    hideContextMenu,
    handleWindowKeydown,
    sidebarWidth,
    activeSidebarView,
  } from './lib/stores.js'
  import Menubar from './lib/Menubar.svelte'
  import ActivityBar from './lib/ActivityBar.svelte'
  import FileTree from './lib/FileTree.svelte'
  import Editor from './lib/Editor.svelte'
  import ContextMenu from './lib/ContextMenu.svelte'

  import {
    registerCommand,
    onCommandAfter,
  } from './lib/commands/index.js'
  import { registerShortcut, handleShortcutKeydown } from './lib/commands/shortcuts.js'
  import cycleDown from './lib/commands/cycle-down.js'
  import cycleUp from './lib/commands/cycle-up.js'
  import focusSidebar from './lib/commands/focus-sidebar.js'

  // ── Register commands ──
  registerCommand('cycle-down', cycleDown)
  registerCommand('cycle-up', cycleUp)
  registerCommand('focus-sidebar', focusSidebar)

  // After cycling, focus the newly active activity icon
  function focusActivityIcon() {
    requestAnimationFrame(() => {
      const view = $activeSidebarView
      const sel = view
        ? `.activity-icon[title="${view.charAt(0).toUpperCase() + view.slice(1)}"]`
        : '.activity-icon'
      const btn = document.querySelector(sel)
      if (btn) btn.focus()
    })
  }
  onCommandAfter('cycle-down', focusActivityIcon)
  onCommandAfter('cycle-up', focusActivityIcon)

  // ── Register shortcuts ──
  // When the text editor is focused, redirect to focus-sidebar instead
  registerShortcut('ctrl+tab', 'cycle-down', { redirectOnEditor: 'focus-sidebar' })
  registerShortcut('ctrl+shift+tab', 'cycle-up', { redirectOnEditor: 'focus-sidebar' })

  let dragging = false

  /** @param {MouseEvent} event */
  function onDragStart(event) {
    dragging = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
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
    }
  }

  /** Composite keydown: shortcuts first, fallback to existing handler */
  function onKeydown(event) {
    if (handleShortcutKeydown(event)) return
    handleWindowKeydown(event)
  }
</script>

<svelte:window
  on:click={hideContextMenu}
  on:keydown={onKeydown}
  on:resize={hideContextMenu}
  on:mousemove={onDragMove}
  on:mouseup={onDragEnd}
/>

<div class="workspace">
  <Menubar />
  <main class="shell">
    <ActivityBar />
    {#if $activeSidebarView}
      <div class="side-panel" style="width: {$sidebarWidth}px">
        {#if $activeSidebarView === 'explorer'}
          <FileTree />
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