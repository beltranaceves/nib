import { get } from 'svelte/store'
import { activeSidebarView } from '../stores.js'

const views = ['explorer', 'blank']

/**
 * Cycle one step down the activity bar. Never wraps.
 * null → explorer → blank → null (closes, callers should focus the editor)
 */
export default function cycleDown() {
  const current = get(activeSidebarView)
  if (current === null) {
    activeSidebarView.set(views[0])
  } else {
    const idx = views.indexOf(current)
    activeSidebarView.set(idx < views.length - 1 ? views[idx + 1] : null)
  }
}
