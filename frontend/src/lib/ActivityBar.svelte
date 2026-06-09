<script>
  import { activeSidebarView } from './stores.js'

  const views = [
    {
      id: 'explorer',
      label: 'Explorer',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    },
    {
      id: 'blank',
      label: 'Blank',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`
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
