const DB_NAME = 'lorecraft'
const STORE_NAME = 'databases'
const DB_KEY = 'main'

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(DB_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(data, DB_KEY)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/**
 * Creates a debounced persist function that writes to IndexedDB.
 * Also registers a beforeunload handler for final flush.
 */
export function createPersistScheduler(
  getDbData: () => Uint8Array,
  debounceMs = 2000,
): { schedulePersist: () => void; dispose: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    const data = getDbData()
    saveToIndexedDB(data).catch((err) => console.error('[Persist] IndexedDB save failed:', err))
  }

  function schedulePersist() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, debounceMs)
  }

  function beforeUnload() {
    flush()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', beforeUnload)
  }

  function dispose() {
    if (timer) clearTimeout(timer)
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }

  return { schedulePersist, dispose }
}
