<script>
  import {
    projectRoot, selectedPath, selectedIsDir,
    snippets, frontmatterTitle, frontmatterTags, busy,
  } from './stores.js'

  let captureInput = ''

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

  async function handleAdd() {
    if (!captureInput.trim()) return
    await api().AddSnippet($selectedPath, captureInput.trim())
    captureInput = ''
    await reloadSnippets()
  }

  async function removeAt(i) {
    await api().RemoveSnippet($selectedPath, i)
    await reloadSnippets()
  }

  let editingIndex = -1

  function saveEdit(i, val) {
    if (editingIndex !== i) return
    editingIndex = -1
    const t = val.trim()
    if (!t) return
    api().UpdateSnippet($selectedPath, i, t).then(reloadSnippets)
  }

  function captureKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
    if (e.key === 'Escape') { captureInput = ''; e.target.blur() }
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
    <div class="capture-row">
      <textarea class="capture-input" rows="2" bind:value={captureInput}
        placeholder={hasMd ? 'Write a snippet…' : 'Open a .md file first'}
        disabled={!hasMd || $busy} on:keydown={captureKeydown} spellcheck="false" />
      <button class="capture-btn" disabled={!hasMd || $busy || !captureInput.trim()} on:click={handleAdd}>Add</button>
    </div>
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
            <input class="edit-input" type="text" value={snippet}
              on:keydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(i, e.target.value) }
                if (e.key === 'Escape') { e.preventDefault(); editingIndex = -1 }
              }}
              on:blur={(e) => saveEdit(i, e.target.value)} autofocus spellcheck="false" />
          {:else}
            <span class="snippet-text" on:click={() => editingIndex = i}
              on:keydown={(e) => { if (e.key === 'Enter') editingIndex = i }}
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
  .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(148,163,184,0.12); }
  .panel-title { font-weight: 600; color: #e2e8f0; }
  .panel-meta { color: #94a3b8; font-size: 0.82rem; }
  .capture-row { display: flex; gap: 0.4rem; padding: 0.6rem 0.8rem; border-bottom: 1px solid rgba(148,163,184,0.08); }
  .capture-input { flex: 1; padding: 0.5rem; border: 1px solid rgba(148,163,184,0.2); border-radius: 8px; background: rgba(30,41,59,0.7); color: #e2e8f0; font-size: 0.85rem; resize: none; font-family: inherit; line-height: 1.5; outline: none; }
  .capture-input:focus { border-color: rgba(96,165,250,0.5); }
  .capture-btn { flex: 0 0 auto; align-self: flex-start; }
  .snippets-body { flex: 1; overflow: auto; padding: 0.5rem; }
  .snippet-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.5rem; border-radius: 8px; color: #e2e8f0; }
  .snippet-row:hover { background: rgba(148,163,184,0.08); }
  .snippet-row.editing { background: rgba(148,163,184,0.05); }
  .snippet-text { flex: 1; font-size: 0.88rem; line-height: 1.4; word-break: break-word; cursor: text; padding: 0.2rem 0; }
  .edit-input { flex: 1; padding: 0.3rem 0.5rem; border: 1px solid rgba(96,165,250,0.5); border-radius: 6px; background: rgba(30,41,59,0.9); color: #e2e8f0; font-size: 0.88rem; font-family: inherit; outline: none; }
  .delete-btn { cursor: pointer; border: 0; border-radius: 6px; background: transparent; color: #64748b; font-size: 1.1rem; padding: 0.2rem 0.35rem; opacity: 0; }
  .snippet-row:hover .delete-btn, .snippet-row.editing .delete-btn { opacity: 1; }
  .delete-btn:hover:not(:disabled) { color: #f87171; background: rgba(248,113,113,0.12); }
  .delete-btn:disabled { cursor: not-allowed; opacity: 0.3; }
  .empty { color: #64748b; font-size: 0.85rem; text-align: center; padding: 1.5rem 0.5rem; }
</style>
