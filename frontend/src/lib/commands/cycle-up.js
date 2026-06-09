import { get } from 'svelte/store'
import { activeSidebarView } from '../stores.js'

const views = ['explorer', 'blank']

/**
 * Cycle one step up the activity bar. Closes when already at the top.
 * blank → explorer → null
 */
export default function cycleUp() {
  const current = get(activeSidebarView)
  if (current === null || current === views[0]) {
    activeSidebarView.set(null)
  } else {
    activeSidebarView.set(views[views.indexOf(current) - 1])
  }
}
