<script>
  import { get } from 'svelte/store'
  import {
    projectRoot, selectedPath, selectedIsDir,
    snippets, frontmatterTitle, frontmatterTags, busy,
    editorView,
  } from './stores.js'
  import CaptureRow from './CaptureRow.svelte'

  function api() { return (/** @type {any} */ (window))?.go?.main?.App }

  async function reloadSnippets() {
    const p = $selectedPath
    const clear = () => { snippets.set([]); frontmatterTitle.set(''); frontmatterTags.set([]) }
    if (!p || (!p.endsWith('.md') && !p.endsWith('.markdown'))) { clear(); return }
    try {
      const r = await api().ReadFrontmatter(p)
      const fm = (r && r.frontmatter) || {}
      snippets.set(fm.snippets || []); frontmatterTitle.set(fm.title || ''); frontmatterTags.set(fm.tags || [])
    } catch { clear() }
  }

  async function removeAt(i) {
    await api().RemoveSnippet($selectedPath, i)
    await reloadSnippets()
  }

  let editingIndex = -1
  let editValue = ''
  let expandedIndex = -1

  function beginEdit(i, current) {
    expandedIndex = i
    editingIndex = i
    editValue = current
  }

  function saveEdit(i) {
    if (editingIndex !== i) return
    editingIndex = -1
    const t = editValue.trim()
    if (!t) return
    api().UpdateSnippet($selectedPath, i, t).then(reloadSnippets)
  }

  function cancelEdit() {
    editingIndex = -1
  }

  function expandRow(i) {
    expandedIndex = expandedIndex === i ? -1 : i
  }

  function needsTruncation(snippet) {
    const firstLine = snippet.split('\n')[0]
    return snippet.includes('\n') || firstLine.length > 80
  }

  function getPreview(snippet) {
    const firstLine = snippet.split('\n')[0]
    if (firstLine.length > 80) return firstLine.substring(0, 80) + '…'
    return firstLine
  }

  $: hasProject = !!$projectRoot
  $: hasMd = !!$selectedPath && !$selectedIsDir && ($selectedPath.endsWith('.md') || $selectedPath.endsWith('.markdown'))
</script>

<section class="snippets-panel">
  <div class="panel-header">
    <span class="panel-title">Snippets</span>
    <span class="panel-meta">{hasMd ? `${$snippets.length} snip${$snippets.length !== 1 ? 's' : ''}` : 'No .md file'}</span>
  </div>

  {#if hasProject}
    <CaptureRow on:snippetadded={reloadSnippets} />
  {/if}

  <div class="snippets-body">
    {#if !hasProject || !hasMd}
      <div class="empty">{!hasProject ? 'Open a project to start.' : 'Select a .md file to manage snippets.'}</div>
    {:else if $snippets.length === 0}
      <div class="empty">No snippets yet. Write one above.</div>
    {:else}
      {#each $snippets as snippet, i}
        <div class="snippet-row" class:expanded={expandedIndex === i} class:editing={editingIndex === i}
          on:keydown={(e) => {
            if (e.key === 'Enter' && editingIndex !== i) {
              const v = get(editorView)
              if (v) {
                const from = v.state.selection.main.head
                const insert = (from > 0 ? '\n' : '') + snippet + '\n'
                v.dispatch({ changes: { from, insert }, selection: { anchor: from + insert.length } })
                v.focus()
              }
            }
          }} role="button" tabindex="0">
          {#if editingIndex === i}
            <!-- svelte-ignore a11y-autofocus -->
            <textarea class="edit-textarea" bind:value={editValue}
              rows={Math.min(10, Math.max(2, editValue.split('\n').length))}
              on:keydown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEdit(i) }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              }}
              on:blur={() => saveEdit(i)} autofocus spellcheck="false"></textarea>
          {:else}
            <span class="chevron" class:visible={needsTruncation(snippet)}>▾</span>
            {#if expandedIndex === i}
              <span class="snippet-text expanded" on:click={() => beginEdit(i, snippet)}
                on:keydown={(e) => { if (e.key === 'Enter') beginEdit(i, snippet) }}
                role="button" tabindex="-1">{snippet}</span>
            {:else}
              <span class="snippet-text preview" on:click={() => expandRow(i)}
                on:keydown={(e) => { if (e.key === 'Enter') expandRow(i) }}
                role="button" tabindex="-1">{getPreview(snippet)}{needsTruncation(snippet) ? '…' : ''}</span>
            {/if}
          {/if}
          <button class="delete-btn" on:click={() => removeAt(i)} disabled={$busy}>×</button>
        </div>
      {/each}
    {/if}
  </div>
</section>

<style>
  .snippets-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem 0.55rem; border-bottom: 1px solid rgba(148,163,184,0.1); }
  .panel-title { font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
  .panel-meta { color: #64748b; font-size: 0.75rem; }
  .snippets-body { flex: 1; overflow: auto; padding: 0.25rem 0.35rem; }
  .snippet-row { display: flex; align-items: flex-start; gap: 0.2rem; padding: 0.3rem 0.4rem; border-radius: 4px; color: #e2e8f0; cursor: default; }
  .snippet-row:hover { background: rgba(148,163,184,0.07); }
  .snippet-row.expanded:not(.editing) { background: rgba(148,163,184,0.04); border-bottom: 1px solid rgba(148,163,184,0.06); margin-bottom: 0.15rem; padding-bottom: 0.4rem; }
  .snippet-row.editing { background: rgba(96,165,250,0.06); }
  .chevron { flex: 0 0 14px; color: #64748b; font-size: 0.6rem; opacity: 0; width: 14px; text-align: center; transition: transform 0.15s ease, opacity 0.1s ease; user-select: none; line-height: 1.7; }
  .chevron.visible { opacity: 0.5; }
  .snippet-row.expanded .chevron { transform: rotate(90deg); }
  .snippet-text { flex: 1; font-size: 0.82rem; line-height: 1.5; padding: 0.1rem 0; cursor: pointer; }
  .snippet-text.preview { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #94a3b8; }
  .snippet-text.expanded { white-space: pre-wrap; word-break: break-word; cursor: text; color: #cbd5e1; }
  .snippet-row:hover .snippet-text.preview { color: #e2e8f0; }
  .snippet-row:hover .snippet-text.expanded { color: #e2e8f0; }
  .edit-textarea {
    flex: 1; min-width: 0; padding: 0.3rem 0.4rem;
    border: 1px solid #60a5fa; border-radius: 4px;
    background: rgba(15,23,42,0.85); color: #e2e8f0;
    font-size: 0.82rem; font-family: inherit; line-height: 1.5;
    outline: none; box-shadow: 0 0 0 1px rgba(96,165,250,0.3);
    resize: vertical;
  }
  .delete-btn {
    cursor: pointer; border: 0; border-radius: 4px;
    background: transparent; color: #475569;
    font-size: 1rem; line-height: 1;
    padding: 0.15rem 0.25rem; opacity: 0; margin-top: 0.1rem;
    transition: background 0.1s ease, color 0.1s ease, opacity 0.1s ease;
  }
  .snippet-row:hover .delete-btn, .snippet-row.editing .delete-btn { opacity: 1; }
  .delete-btn:hover:not(:disabled) { color: #f87171; background: rgba(248,113,113,0.12); }
  .delete-btn:disabled { cursor: not-allowed; opacity: 0.2; }
  .empty { color: #475569; font-size: 0.8rem; text-align: center; padding: 1.2rem 0.5rem; }
</style>
