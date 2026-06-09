import { executeCommand } from './index.js'

// Each binding: { parsed, commandId, redirectOnEditor }
const bindings = []

/**
 * Normalise a combo string like "ctrl+shift+tab" into a match object.
 */
function parseCombo(combo) {
  const parts = combo.toLowerCase().split('+')
  const key = parts.pop()
  const mods = {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
  }
  for (const mod of parts) {
    if (mod === 'ctrl' || mod === 'cmd') {
      mods.ctrlKey = true
      mods.metaKey = true
    } else if (mod === 'shift') {
      mods.shiftKey = true
    } else if (mod === 'alt') {
      mods.altKey = true
    }
  }
  return { code: key === 'tab' ? 'Tab' : key, ...mods }
}

/**
 * Register a keyboard shortcut.
 * @param {string} combo     – e.g. "ctrl+tab", "ctrl+shift+tab"
 * @param {string} commandId – command to run on match
 * @param {object} [opts]
 * @param {string} [opts.redirectOnEditor] – command to run instead when the
 *                                           text editor is focused
 */
export function registerShortcut(combo, commandId, opts = {}) {
  bindings.push({
    parsed: parseCombo(combo),
    commandId,
    redirectOnEditor: opts.redirectOnEditor || null,
  })
}

/**
 * Returns true when the active element is inside the editor.
 */
function isEditorFocused() {
  const el = document.activeElement
  return !!(
    el &&
    (el.tagName === 'TEXTAREA' || el.closest('.editor-shell'))
  )
}

/**
 * Try to dispatch a shortcut. Returns true if a binding matched.
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function handleShortcutKeydown(event) {
  for (const b of bindings) {
    const p = b.parsed
    const modsMatch =
      (event.ctrlKey || event.metaKey) === (p.ctrlKey || p.metaKey) &&
      event.shiftKey === p.shiftKey &&
      event.altKey === p.altKey

    if (modsMatch && event.code === p.code) {
      event.preventDefault()
      event.stopPropagation()

      if (isEditorFocused() && b.redirectOnEditor) {
        executeCommand(b.redirectOnEditor)
      } else {
        executeCommand(b.commandId)
      }
      return true
    }
  }
  return false
}
