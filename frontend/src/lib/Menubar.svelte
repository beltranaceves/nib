<script>
  import {
    busy,
    projectRoot,
    selectedPath,
    selectedIsDir,
    dirty,
  } from './stores.js'
  import {
    openProjectFromPicker,
    createProjectFromPicker,
    createFile,
    createFolder,
    saveFile,
  } from './file-tree.js'
</script>

<header class="menubar">
  <div class="app-name">nib</div>

  <div class="menu-group">
    <button
      class="menu-button"
      disabled={$busy}
      on:click={openProjectFromPicker}
      type="button"
    >
      Open Project
    </button>
    <button
      class="menu-button"
      disabled={$busy}
      on:click={createProjectFromPicker}
      type="button"
    >
      New Project
    </button>
    <button
      class="menu-button"
      disabled={$busy || !$projectRoot}
      on:click={() => createFile()}
      type="button"
    >
      New File
    </button>
    <button
      class="menu-button"
      disabled={$busy || !$projectRoot}
      on:click={() => createFolder()}
      type="button"
    >
      New Folder
    </button>
    <button
      class="menu-button"
      disabled={$busy || !$selectedPath || $selectedIsDir || !$dirty}
      on:click={saveFile}
      type="button"
    >
      Save
    </button>
  </div>

  <div class="menu-status">{$projectRoot || 'No project open'}</div>
</header>
