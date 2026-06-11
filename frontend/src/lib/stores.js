import { writable } from 'svelte/store'



// ── Writable stores ──

/** @type {import('svelte/store').Writable<string>} */
export const projectRoot = writable('')

/** @type {import('svelte/store').Writable<Record<string, Entry[]>>} */
export const folderCache = writable({})

/** @type {import('svelte/store').Writable<string[]>} */
export const expandedFolders = writable([])

/** @type {import('svelte/store').Writable<Array<{entry: Entry, depth: number}>>} */
export const visibleRows = writable([])

/** @type {import('svelte/store').Writable<string>} */
export const selectedPath = writable('')

/** @type {import('svelte/store').Writable<boolean>} */
export const selectedIsDir = writable(false)

/** @type {import('svelte/store').Writable<string>} */
export const selectedContent = writable('')

/** @type {import('svelte/store').Writable<boolean>} */
export const dirty = writable(false)

/** @type {import('svelte/store').Writable<boolean>} */
export const busy = writable(false)

/** @type {import('svelte/store').Writable<string>} */
export const statusMessage = writable('Open a project to start.')

/** @type {import('svelte/store').Writable<null|{x:number,y:number,entry:Entry}>} */
export const contextMenu = writable(null)

// ── Editor ──

/** @type {import('svelte/store').Writable<import('@codemirror/view').EditorView|null>} */
export const editorView = writable(null)

// ── Frontmatter / Snippets ──

/** @type {import('svelte/store').Writable<string[]>} */
export const snippets = writable([])

/** @type {import('svelte/store').Writable<string>} */
export const frontmatterTitle = writable('')

/** @type {import('svelte/store').Writable<string[]>} */
export const frontmatterTags = writable([])

// ── Active sidebar view ──

/** @type {import('svelte/store').Writable<string|null>} */
export const activeSidebarView = writable('explorer')

// ── Layout ──

const savedWidth = typeof localStorage !== 'undefined'
  ? parseInt(localStorage.getItem('nib:sidebarWidth') || '300', 10)
  : 300
/** @type {import('svelte/store').Writable<number>} */
export const sidebarWidth = writable(Math.max(200, Math.min(600, savedWidth)))
sidebarWidth.subscribe(val => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('nib:sidebarWidth', String(val))
  }
})
