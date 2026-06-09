<script>
  import {
    selectedPath,
    selectedIsDir,
    selectedContent,
    dirty,
    busy,
    statusMessage,
  } from './stores.js'
  import { saveFile } from './stores.js'
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
        on:click={saveFile}
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
      bind:value={$selectedContent}
      class="editor"
      on:input={() => {
        dirty.set(true)
      }}
      placeholder="Write markdown here..."
      spellcheck="true"
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
