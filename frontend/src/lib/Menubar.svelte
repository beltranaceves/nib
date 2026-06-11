<script>
  import { onMount, onDestroy } from 'svelte'
  import {
    busy,
    projectRoot,
    selectedPath,
    selectedIsDir,
    dirty,
  } from './stores.js'
  import {
    openProjectFromPicker,
    createFile,
    createFolder,
    saveFile,
  } from './file-tree.js'
  import { GetProcessStats } from '../../wailsjs/go/main/App'
  import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime'

  let stats = { memoryMB: 0, uptime: '', cpuLoad: 0, startupTime: '' }
  let statsInterval

  onMount(() => {
    fetchStats()
    statsInterval = setInterval(fetchStats, 5000)
  })

  onDestroy(() => {
    clearInterval(statsInterval)
  })

  async function fetchStats() {
    try {
      stats = await GetProcessStats()
    } catch {
      // silently ignore — backend might not be ready yet
    }
  }

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'Open Project\u2026', action: openProjectFromPicker, disabled: () => $busy },
        { type: 'separator' },
        { label: 'New File', action: () => createFile(), disabled: () => $busy || !$projectRoot },
        { label: 'New Folder', action: () => createFolder(), disabled: () => $busy || !$projectRoot },
        { label: 'Save', action: saveFile, disabled: () => $busy || !$selectedPath || $selectedIsDir || !$dirty, shortcut: '\u2318S' },
        { type: 'separator' },
        { label: 'Exit', action: () => Quit() },
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
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="menu-dropdown" on:click|stopPropagation on:keydown={() => {}}>
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

  <div class="menu-status">
    <span class="project-path">{$projectRoot || 'No project open'}</span>
    <span class="process-stats">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="stat memory-stat" on:keydown={() => {}}>
        &#9679; {stats.memoryMB.toFixed(1)} MB
        <div class="stats-popup">
          <div class="popup-row"><span class="popup-label">Uptime</span><span class="popup-value">{stats.uptime}</span></div>
          <div class="popup-row"><span class="popup-label">CPU load</span><span class="popup-value">{stats.cpuLoad.toFixed(1)}%</span></div>
          <div class="popup-row"><span class="popup-label">Startup</span><span class="popup-value">{stats.startupTime}</span></div>
        </div>
      </span>
    </span>
  </div>

  <div class="window-controls">
    <button class="win-btn win-min" on:click={() => WindowMinimise()} title="Minimize" type="button">
      <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="5.5" width="10" height="1" fill="currentColor"/></svg>
    </button>
    <button class="win-btn win-max" on:click={() => WindowToggleMaximise()} title="Maximize" type="button">
      <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>
    </button>
    <button class="win-btn win-close" on:click={() => Quit()} title="Close" type="button">
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.2"/></svg>
    </button>
  </div>
</header>
