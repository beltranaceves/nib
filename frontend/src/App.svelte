<script>
  import { hideContextMenu, handleWindowKeydown } from './lib/stores.js'
  import Menubar from './lib/Menubar.svelte'
  import FileTree from './lib/FileTree.svelte'
  import Editor from './lib/Editor.svelte'
  import ContextMenu from './lib/ContextMenu.svelte'
</script>

<svelte:window
  on:click={hideContextMenu}
  on:keydown={handleWindowKeydown}
  on:resize={hideContextMenu}
/>

<div class="workspace">
  <Menubar />
  <main class="shell">
    <FileTree />
    <Editor />
  </main>
  <ContextMenu />
</div>