// Tiny cross-component registry of "unsaved edits in progress". Lets global
// actions (e.g. the PWA update prompt's force-reload) avoid destroying user input
// without threading edit state through the tree. TaskDetail keeps it in sync.
let unsaved = false

export function setUnsaved(value: boolean) {
  unsaved = value
}

export function hasUnsaved() {
  return unsaved
}
