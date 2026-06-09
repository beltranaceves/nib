// ── Command registry ──
// Commands are pure logic that read/write stores.
// After-hooks let UI code respond (e.g. focus an element).

const commands = new Map()
const afterHooks = new Map()

/**
 * Register a command handler.
 * @param {string} id
 * @param {(...args: any[]) => any} fn
 */
export function registerCommand(id, fn) {
  commands.set(id, fn)
}

/**
 * Execute a registered command.
 * @param {string} id
 * @param {...any} args
 * @returns {any}
 */
export function executeCommand(id, ...args) {
  const fn = commands.get(id)
  if (!fn) {
    console.warn(`[commands] "${id}" is not registered`)
    return
  }
  const result = fn(...args)
  const hooks = afterHooks.get(id)
  if (hooks) hooks.forEach((cb) => cb(result, ...args))
  return result
}

/**
 * Register a callback that runs after a command executes.
 * @param {string} id
 * @param {(result: any, ...args: any[]) => void} fn
 */
export function onCommandAfter(id, fn) {
  if (!afterHooks.has(id)) afterHooks.set(id, [])
  afterHooks.get(id).push(fn)
}
