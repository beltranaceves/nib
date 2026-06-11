<script>
  import { onDestroy } from 'svelte'
  import {
    selectedPath,
    selectedIsDir,
    selectedContent,
    dirty,
    busy,
    statusMessage,
    editorView,
  } from './stores.js'
  import { saveFile } from './file-tree.js'

  import { EditorState } from '@codemirror/state'
  import { EditorView, keymap } from '@codemirror/view'
  import { markdown } from '@codemirror/lang-markdown'
  import {
    livePreviewPlugin,
    markdownStylePlugin,
    editorTheme as cmLiveTheme,
    mouseSelectingField,
    collapseOnSelectionFacet,
    setMouseSelecting,
    codeBlockField,
    tableField,
    linkPlugin,
    imageField,
  } from 'codemirror-live-markdown'

  let editorContainer
  let view = null
  let localDirty = false
  let syncingFromStore = false
  let loadedContent = ''
  let mouseUpHandler = null

  async function handleSave() {
    if (!view) return
    $selectedContent = view.state.doc.toString()
    dirty.set(true)
    await saveFile()
    localDirty = false
  }

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  /** Create the editor view when container + file are ready */
  $: if (editorContainer && $selectedPath && !$selectedIsDir && !view) {
    const content = $selectedContent || ''
    loadedContent = content

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        collapseOnSelectionFacet.of(true),
        mouseSelectingField,
        livePreviewPlugin,
        markdownStylePlugin,
        cmLiveTheme,
        codeBlockField({ copyButton: true }),
        tableField,
        linkPlugin(),
        imageField(),
        keymap.of([
          { key: 'Mod-s', run: () => { handleSave(); return true } },
        ]),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !syncingFromStore) {
            localDirty = true
          }
        }),
        EditorView.domEventHandlers({
          drop(event) {
            const ideaText = event.dataTransfer.getData('text/plain')
            if (!ideaText || !view) return false
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (pos === null || pos === undefined) return false
            const insert = (pos > 0 && view.state.doc.sliceString(pos - 1, pos) !== '\n' ? '\n' : '') + ideaText + '\n'
            view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } })
            view.focus()
            return true
          },
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    })

    view = new EditorView({ state, parent: editorContainer })
    $editorView = view

    // Track mouse selection state (required by codemirror-live-markdown)
    view.contentDOM.addEventListener('mousedown', () => {
      view.dispatch({ effects: setMouseSelecting.of(true) })
    })

    mouseUpHandler = () => {
      requestAnimationFrame(() => {
        if (view) {
          view.dispatch({ effects: setMouseSelecting.of(false) })
        }
      })
    }
    document.addEventListener('mouseup', mouseUpHandler)
  }

  /** Destroy the editor when file is deselected; sync content otherwise */
  $: if (view) {
    if (!$selectedPath || $selectedIsDir) {
      $editorView = null
      if (mouseUpHandler) {
        document.removeEventListener('mouseup', mouseUpHandler)
        mouseUpHandler = null
      }
      view.destroy()
      view = null
      localDirty = false
      loadedContent = ''
    } else {
      const cur = $selectedContent
      if (cur !== loadedContent && cur !== view.state.doc.toString()) {
        syncingFromStore = true
        loadedContent = cur
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: cur },
        })
        syncingFromStore = false
        localDirty = false
      } else if (cur !== loadedContent) {
        loadedContent = cur
      }
    }
  }

  onDestroy(() => {
    $editorView = null
    if (mouseUpHandler) {
      document.removeEventListener('mouseup', mouseUpHandler)
    }
    if (view) {
      view.destroy()
      view = null
    }
  })
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

  <!-- Always rendered — one visible at a time via CSS -->
  <div class="editor-container" class:active={!!$selectedPath && !$selectedIsDir} bind:this={editorContainer} on:dragover={handleDragOver} />
  <div class="editor-empty" class:active={!$selectedPath || $selectedIsDir}>
    {#if $selectedIsDir}
      This is a folder. Pick a file to edit, or use the menu to create a file
      here.
    {:else}
      Pick a text file from the explorer.
    {/if}
  </div>
</section>
