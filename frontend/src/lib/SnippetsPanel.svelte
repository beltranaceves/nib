<script>
  import {
    projectRoot, selectedPath, selectedIsDir,
    snippets, frontmatterTitle, frontmatterTags, busy,
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

  function beginEdit(i, current) {
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
        <div class="snippet-row" class:editing={editingIndex === i}
          on:keydown={(e) => {
            if (e.key === 'Enter' && editingIndex !== i) {
              const ed = document.querySelector('.editor')
              if (ed) {
                const s = ed.selectionStart
                ed.value = ed.value.substring(0, s) + (s > 0 ? '\n' : '') + snippet + '\n' + ed.value.substring(s)
                ed.selectionStart = ed.selectionEnd = s + snippet.length + 2
                ed.focus()
                ed.dispatchEvent(new Event('input', { bubbles: true }))
              }
            }
          }} role="button" tabindex="0">
          {#if editingIndex === i}
            <!-- svelte-ignore a11y-autofocus -->
            <input class="edit-input" type="text" bind:value={editValue}
              on:keydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(i) }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              }}
              on:blur={() => saveEdit(i)} autofocus spellcheck="false" />
          {:else}
            <span class="snippet-text" on:click={() => beginEdit(i, snippet)}
              on:keydown={(e) => { if (e.key === 'Enter') beginEdit(i, snippet) }}
              role="button" tabindex="-1">{snippet}</span>
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
  .snippet-row { display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.4rem; border-radius: 4px; color: #e2e8f0; cursor: default; }
  .snippet-row:hover { background: rgba(148,163,184,0.07); }
  .snippet-row.editing { background: rgba(96,165,250,0.06); }
  .snippet-text { flex: 1; font-size: 0.82rem; line-height: 1.5; word-break: break-word; cursor: text; padding: 0.15rem 0; color: #cbd5e1; }
  .snippet-row:hover .snippet-text { color: #e2e8f0; }
  .edit-input { flex: 1; min-width: 0; padding: 0.25rem 0.4rem; border: 1px solid #60a5fa; border-radius: 4px; background: rgba(15,23,42,0.85); color: #e2e8f0; font-size: 0.82rem; font-family: inherit; outline: none; box-shadow: 0 0 0 1px rgba(96,165,250,0.3); }
  .delete-btn {
    cursor: pointer; border: 0; border-radius: 4px;
    background: transparent; color: #475569;
    font-size: 1rem; line-height: 1;
    padding: 0.15rem 0.25rem; opacity: 0;
    transition: background 0.1s ease, color 0.1s ease, opacity 0.1s ease;
  }
  .snippet-row:hover .delete-btn, .snippet-row.editing .delete-btn { opacity: 1; }
  .delete-btn:hover:not(:disabled) { color: #f87171; background: rgba(248,113,113,0.12); }
  .delete-btn:disabled { cursor: not-allowed; opacity: 0.2; }
  .empty { color: #475569; font-size: 0.8rem; text-align: center; padding: 1.2rem 0.5rem; }
</style>
