<script>
  import { createEventDispatcher } from 'svelte'
  import { selectedPath, selectedIsDir, busy } from './stores.js'

  const dispatch = createEventDispatcher()

  let captureInput = ''

  function api() { return (/** @type {any} */ (window))?.go?.main?.App }

  async function handleAdd() {
    if (!captureInput.trim()) return
    await api().AddSnippet($selectedPath, captureInput.trim())
    captureInput = ''
    dispatch('snippetadded')
  }

  function captureKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
    if (e.key === 'Escape') { captureInput = ''; e.target.blur() }
  }

  $: hasMd = !!$selectedPath && !$selectedIsDir && ($selectedPath.endsWith('.md') || $selectedPath.endsWith('.markdown'))
</script>

<div class="capture-row">
  <div class="capture-wrapper">
    <input class="capture-input" type="text" bind:value={captureInput}
      placeholder={hasMd ? 'Add snippet… (Ctrl+↵)' : 'Open a .md file first'}
      disabled={!hasMd || $busy} on:keydown={captureKeydown} spellcheck="false" />
    <button class="capture-btn" disabled={!hasMd || $busy || !captureInput.trim()} on:click={handleAdd}
      title="Add snippet">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</div>

<style>
  .capture-row { padding: 0.5rem 0.75rem 0.6rem; border-bottom: 1px solid rgba(148,163,184,0.1); }
  .capture-wrapper { display: flex; align-items: center; gap: 0.25rem; }
  .capture-input {
    flex: 1; min-width: 0; padding: 0.35rem 0.5rem;
    border: 1px solid rgba(148,163,184,0.18); border-radius: 4px;
    background: rgba(30,41,59,0.6); color: #e2e8f0;
    font-size: 0.82rem; font-family: inherit; line-height: 1.5;
    outline: none; transition: border-color 0.12s ease, box-shadow 0.12s ease;
  }
  .capture-input::placeholder { color: #475569; font-size: 0.78rem; }
  .capture-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 1px rgba(96,165,250,0.25); }
  .capture-input:disabled { opacity: 0.4; cursor: not-allowed; }
  .capture-btn {
    display: flex; align-items: center; justify-content: center;
    flex: 0 0 26px; width: 26px; height: 26px;
    border: 0; border-radius: 4px;
    background: transparent; color: #94a3b8;
    cursor: pointer; transition: background 0.1s ease, color 0.1s ease;
  }
  .capture-btn:hover:not(:disabled) { background: rgba(96,165,250,0.15); color: #60a5fa; }
  .capture-btn:disabled { cursor: not-allowed; opacity: 0.3; }
</style>
