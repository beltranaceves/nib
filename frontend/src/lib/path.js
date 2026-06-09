// ── Path constants ──
export const ROOT_FOLDER = ''

// ── Path utilities ──
export function normalizePath(path) {
  return (path || '').replace(/\\/g, '/')
}

export function joinPath(...segments) {
  return normalizePath(segments.filter(Boolean).join('/')).replace(/\/+/g, '/')
}

export function parentPath(path) {
  const normalized = normalizePath(path)
  const slashIndex = normalized.lastIndexOf('/')
  return slashIndex > 0 ? normalized.slice(0, slashIndex) : ''
}

export function pathIsUnderPath(path, rootPath) {
  return path === rootPath || path.startsWith(`${rootPath}/`)
}

export function rewritePath(path, oldRoot, newRoot) {
  if (!pathIsUnderPath(path, oldRoot)) return path
  return newRoot + path.slice(oldRoot.length)
}
