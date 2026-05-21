const SETTINGS_NAV_EVENT = "settings:nav"

export function navigateSettings(section: string) {
  window.dispatchEvent(new CustomEvent(SETTINGS_NAV_EVENT, { detail: section }))
}

export function onSettingsNav(handler: (section: string) => void) {
  const cb = (e: Event) => handler((e as CustomEvent).detail)
  window.addEventListener(SETTINGS_NAV_EVENT, cb)
  return () => window.removeEventListener(SETTINGS_NAV_EVENT, cb)
}
