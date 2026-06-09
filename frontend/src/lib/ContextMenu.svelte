<script>
  import { contextMenu } from './stores.js'
  import { openContextAction } from './stores.js'
</script>

{#if $contextMenu}
  <div
    class="context-menu"
    on:contextmenu|preventDefault
    style={`left: ${$contextMenu.x}px; top: ${$contextMenu.y}px`}
  >
    <button
      class="context-item"
      on:click={() => openContextAction('open')}
      type="button"
    >
      Open
    </button>
    <button
      class="context-item"
      on:click={() => openContextAction('new-file')}
      type="button"
    >
      New File Here
    </button>
    <button
      class="context-item"
      on:click={() => openContextAction('new-folder')}
      type="button"
    >
      New Folder Here
    </button>
    <button
      class="context-item"
      on:click={() => openContextAction('rename')}
      type="button"
    >
      Rename
    </button>
    <button
      class="context-item danger"
      on:click={() => openContextAction('delete')}
      type="button"
    >
      Delete
    </button>
  </div>
{/if}
