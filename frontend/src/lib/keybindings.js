import { get } from 'svelte/store'
import { activeSidebarView, selectedPath, editorView } from './stores.js'
import { saveFile, openProjectFromPicker, renamePath, deletePath, hideContextMenu } from './file-tree.js'

const views = ['explorer', 'snippets']

function matchMods(event, combo) {
  const parts = combo.split('+')
  const key = parts.pop()
  const code = key === 'tab' ? 'Tab' : key.charAt(0).toUpperCase() + key.slice(1)
  return (
    event.code === code &&
    (event.ctrlKey || event.metaKey) === (parts.includes('ctrl') || parts.includes('cmd')) &&
    event.shiftKey === parts.includes('shift') &&
    event.altKey === parts.includes('alt')
  )
}

function cycleView(dir) {
  const cur = get(activeSidebarView)
  const idx = views.indexOf(cur)
  const next = cur === null ? views[dir === 1 ? 0 : views.length - 1] : views[idx + dir]
  if (next !== undefined) activeSidebarView.set(next)
  else activeSidebarView.set(null)
  requestAnimationFrame(() => {
    const v = get(activeSidebarView)
    if (!v) { get(editorView)?.focus(); return }
    document.querySelector(`.activity-icon[title="${v.charAt(0).toUpperCase() + v.slice(1)}"]`)?.focus()
  })
}

const bindings = new Map()

bindings.set('ctrl+tab', () => {
  const inEd = document.activeElement?.closest('.cm-editor') || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.closest('.editor-shell')
  inEd ? document.querySelector('.side-panel')?.focus() : cycleView(1)
})
bindings.set('ctrl+shift+tab', () => {
  const inEd = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.closest('.editor-shell')
  inEd ? document.querySelector('.side-panel')?.focus() : cycleView(-1)
})
bindings.set('ctrl+i', () => {
  activeSidebarView.set('snippets')
  requestAnimationFrame(() => document.querySelector('.capture-input')?.focus())
})
bindings.set('ctrl+s', () => saveFile())
bindings.set('ctrl+o', () => openProjectFromPicker())
bindings.set('escape', () => hideContextMenu())
bindings.set('f2', () => { const p = get(selectedPath); if (p) renamePath(p) })
bindings.set('delete', () => { const p = get(selectedPath); if (p) deletePath(p) })

export function handleKeydown(event) {
  for (const [combo, handler] of bindings) {
    if (matchMods(event, combo)) {
      event.preventDefault()
      event.stopPropagation()
      handler(event)
      return true
    }
  }
  return false
}
