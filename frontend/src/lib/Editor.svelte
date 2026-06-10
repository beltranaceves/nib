<script>
  import {
    selectedPath,
    selectedIsDir,
    selectedContent,
    dirty,
    busy,
    statusMessage,
  } from './stores.js'
  import { saveFile } from './file-tree.js'

  // Local buffer for the textarea — avoids store subscription overhead
  // on every keystroke. Synced to $selectedContent on file switch and blur.
  let text = ''

  // When the store changes externally (file switch, undo, etc), sync to local
  $: if (!$selectedIsDir && $selectedPath) {
    text = $selectedContent
  }

  // Local dirty flag to avoid store write on every keystroke.
  // Flushed to the store before save and on blur.
  let localDirty = false

  function flushToStore() {
    if (localDirty) {
      $selectedContent = text
      dirty.set(true)
      localDirty = false
    }
  }

  function onInput() {
    localDirty = true
  }

  function onBlur() {
    flushToStore()
  }

  /** Sync local state to the store, then delegate to file-tree.js saveFile. */
  async function handleSave() {
    flushToStore()
    await saveFile()
  }

  /** Insert text at the textarea cursor and mark the file as dirty. */
  function insertAtCursor(textarea, ideaText) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = textarea.value.substring(0, start)
    const after = textarea.value.substring(end)
    const prefix = start > 0 && before[start - 1] !== '\n' ? '\n' : ''
    const suffix = '\n'
    const inserted = prefix + ideaText + suffix
    textarea.value = before + inserted + after
    textarea.selectionStart = textarea.selectionEnd = start + inserted.length
    textarea.focus()
    text = textarea.value
    localDirty = true
  }

  function handleDrop(event) {
    event.preventDefault()
    const ideaText = event.dataTransfer.getData('text/plain')
    if (!ideaText) return
    const textarea = event.currentTarget
    insertAtCursor(textarea, ideaText)
  }

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
</script>

<section class="editor-shell">
  <header class="editor-header">
    <div>
      <div class="panel-title">Editor</div>
      <div class="editor-path">
        {#if $selectedPath}
          {$selectedPath}
        {:else}
          No file selected
        {/if}
      </div>
    </div>

    <div class="editor-actions">
      <button
        class="menu-button compact"
        disabled={$busy || !$selectedPath || $selectedIsDir}
        on:click={handleSave}
        type="button"
      >
        Save
      </button>
    </div>
  </header>

  <div class="editor-status">
    <span class:dirty={$dirty}
      >{$dirty ? 'Unsaved changes' : 'Ready'}</span
    >
    <span>{$statusMessage}</span>
  </div>

  {#if $selectedPath && !$selectedIsDir}
    <textarea
      bind:value={text}
      class="editor"
      on:input={onInput}
      on:blur={onBlur}
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      placeholder="Write markdown here..."
      spellcheck="false"
    />
  {:else}
    <div class="editor-empty">
      {#if $selectedIsDir}
        This is a folder. Pick a file to edit, or use the menu to create a file
        here.
      {:else}
        Pick a text file from the explorer. Markdown stays plain for now, ready
        for a richer editor later.
      {/if}
    </div>
  {/if}
</section>
