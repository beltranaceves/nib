<script>
  import { activeSidebarView } from './stores.js'

  const views = [
    {
      id: 'explorer',
      label: 'Explorer',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    },
    {
      id: 'snippets',
      label: 'Snippets',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8a6 6 0 0 0-12 0c0 1.23.5 2.39 1.49 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>`
    }
  ]

  /** @param {string} viewId */
  function toggle(viewId) {
    if ($activeSidebarView === viewId) {
      activeSidebarView.set(null)
    } else {
      activeSidebarView.set(viewId)
    }
  }
</script>

<div class="activity-bar">
  <div class="activity-top">
    {#each views as view}
      <button
        class="activity-icon"
        class:active={$activeSidebarView === view.id}
        on:click={() => toggle(view.id)}
        title={view.label}
        type="button"
      >
        {@html view.icon}
      </button>
    {/each}
  </div>
</div>
