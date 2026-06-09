/**
 * Focus the first activity bar icon (preferring the active one).
 */
export default function focusSidebar() {
  const target = document.querySelector(
    '.activity-icon.active, .activity-bar button'
  )
  if (target) target.focus()
}
