const statuses = ['new', 'completed', 'dismissed', 'disabled']
const memory = new Map()
const changeEvent = 'ecopin-officer-tour-change'
const keyFor = userId => `ecopin:dispatch-tour:v1:${userId}`

export function readTourStatus(userId) {
  if (memory.has(userId)) return memory.get(userId)
  try {
    const value = window.localStorage.getItem(keyFor(userId))
    return statuses.includes(value) ? value : 'new'
  } catch {
    return 'new'
  }
}

export function saveTourStatus(userId, status) {
  let persisted = true
  try {
    window.localStorage.setItem(keyFor(userId), status)
    memory.delete(userId)
  } catch {
    memory.set(userId, status)
    persisted = false
  }
  window.dispatchEvent(new Event(changeEvent))
  return persisted
}

export function subscribeTour(listener) {
  window.addEventListener(changeEvent, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(changeEvent, listener)
    window.removeEventListener('storage', listener)
  }
}
