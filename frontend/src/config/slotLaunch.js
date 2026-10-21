/** iframe (default) or tab — tab opens the provider URL in a new browser tab instead of the overlay. */
export function getSlotLaunchMode() {
  const mode = String(
    import.meta.env.VITE_SLOT_LAUNCH_MODE || import.meta.env.VITE_GIT_SLOTPARK_LAUNCH_MODE || 'iframe'
  )
    .trim()
    .toLowerCase();
  return mode === 'tab' ? 'tab' : 'iframe';
}
