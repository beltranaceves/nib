import { get } from 'svelte/store'
import { activeSidebarView } from '../stores.js'

/**
 * Focus the content area of whichever side panel is open.
 * Explorer → the tree body; Blank → the panel itself.
 */
export default function focusSidebar() {
  const view = get(activeSidebarView)
  if (!view) return

  if (view === 'explorer') {
    const tree = document.querySelector('.tree-body')
    if (tree) {
      // Focus the first tree row, or the tree body as a fallback
      const firstRow = tree.querySelector('.tree-row')
      if (firstRow) {
        firstRow.focus()
      } else {
        tree.setAttribute('tabindex', '-1')
        tree.focus()
      }
      return
    }
  }

  // Blank panel or fallback — focus the side-panel itself
  const panel = document.querySelector('.side-panel')
  if (panel) {
    const focusable = panel.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable) {
      focusable.focus()
    } else {
      panel.setAttribute('tabindex', '-1')
      panel.focus()
    }
  }
}
