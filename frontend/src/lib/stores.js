import { writable } from 'svelte/store'

// ── Writable stores ──
export const projectRoot = writable('')
export const folderCache = writable({})
export const expandedFolders = writable([])
export const visibleRows = writable([])
export const selectedPath = writable('')
export const selectedIsDir = writable(false)
export const selectedContent = writable('')
export const dirty = writable(false)
export const busy = writable(false)
export const statusMessage = writable('Open a project to start.')
export const contextMenu = writable(null)

// ── Active sidebar view ──
// Which panel is shown in the side panel: 'explorer' | 'blank' | null
export const activeSidebarView = writable('explorer')

// ── Layout ──
const savedWidth = typeof localStorage !== 'undefined'
  ? parseInt(localStorage.getItem('nib:sidebarWidth') || '300', 10)
  : 300
export const sidebarWidth = writable(Math.max(200, Math.min(600, savedWidth)))
sidebarWidth.subscribe(val => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nib:sidebarWidth', String(val))
  }
})
