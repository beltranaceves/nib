<script>
  import {
    busy,
    projectRoot,
    selectedPath,
    selectedIsDir,
    dirty,
    activeSidebarView,
  } from './stores.js'
  import {
    openProjectFromPicker,
    createProjectFromPicker,
    createFile,
    createFolder,
    saveFile,
  } from './file-tree.js'

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'Open Project\u2026', action: openProjectFromPicker, disabled: () => $busy },
        { label: 'New Project\u2026', action: createProjectFromPicker, disabled: () => $busy },
        { type: 'separator' },
        { label: 'New File', action: () => createFile(), disabled: () => $busy || !$projectRoot },
        { label: 'New Folder', action: () => createFolder(), disabled: () => $busy || !$projectRoot },
        { label: 'Save', action: saveFile, disabled: () => $busy || !$selectedPath || $selectedIsDir || !$dirty, shortcut: '\u2318S' },
        { type: 'separator' },
        { label: 'Exit', action: () => window.runtime.Quit() },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', shortcut: '\u2318X', action: () => {} },
        { label: 'Copy', shortcut: '\u2318C', action: () => {} },
        { label: 'Paste', shortcut: '\u2318V', action: () => {} },
        { type: 'separator' },
        { label: 'Select All', shortcut: '\u2318A', action: () => {} },
      ],
    },
    {
      label: 'View',
      items: [
        {
          label: 'Toggle Sidebar',
          action: () => activeSidebarView.update(v => v ? null : 'explorer'),
          shortcut: '\u2318B',
        },
        { type: 'separator' },
        { label: 'Zoom In', shortcut: '\u2318+', action: () => {} },
        { label: 'Zoom Out', shortcut: '\u2318-', action: () => {} },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About nib', action: () => alert('nib \u2014 a minimal markdown editor\n\nBuilt with Wails + Svelte') },
      ],
    },
  ]

  let activeMenu = null

  function toggleMenu(label) {
    activeMenu = activeMenu === label ? null : label
  }

  function handleMenuHover(label) {
    if (activeMenu && activeMenu !== label) {
      activeMenu = label
    }
  }

  function handleItemClick(item) {
    activeMenu = null
    if (item.action) item.action()
  }

  function handleRootClick() {
    activeMenu = null
  }
</script>

<svelte:window on:click={handleRootClick} />

<header class="menubar">
  <div class="app-name">nib</div>

  <div class="menu-row">
    {#each menus as menu}
      <div class="menu-container">
        <button
          class="menu-trigger"
          class:active={activeMenu === menu.label}
          on:click|stopPropagation={() => toggleMenu(menu.label)}
          on:mouseenter={() => handleMenuHover(menu.label)}
          type="button"
        >
          {menu.label}
        </button>
        {#if activeMenu === menu.label}
          <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
          <div class="menu-dropdown" on:click|stopPropagation>
            {#each menu.items as item}
              {#if item.type === 'separator'}
                <div class="menu-separator" role="separator"></div>
              {:else}
                <button
                  class="menu-item"
                  disabled={item.disabled?.()}
                  on:click={() => handleItemClick(item)}
                  type="button"
                >
                  <span class="menu-item-label">{item.label}</span>
                  {#if item.shortcut}
                    <span class="menu-item-shortcut">{item.shortcut}</span>
                  {/if}
                </button>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="menu-status">{$projectRoot || 'No project open'}</div>
</header>
