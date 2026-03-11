// ============================================================
// SaveSystem.ts — IndexedDB ile 3-slotlu kayıt sistemi
// ============================================================

import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'tactical-sim-db'
const DB_VERSION = 1
const STORE_NAME = 'save-slots'

export interface SaveSlot {
  slot: number
  scenarioName: string
  timestamp: string
  gameData: Record<string, unknown>
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'slot' })
        }
      },
    })
  }
  return dbPromise
}

export const SaveSystem = {
  async save(slot: number, scenarioName: string, gameData: Record<string, unknown>): Promise<void> {
    const db = await getDb()
    const entry: SaveSlot = {
      slot,
      scenarioName,
      timestamp: new Date().toLocaleString('tr-TR'),
      gameData,
    }
    await db.put(STORE_NAME, entry)
  },

  async load(slot: number): Promise<SaveSlot | null> {
    const db = await getDb()
    return (await db.get(STORE_NAME, slot)) ?? null
  },

  async listSlots(): Promise<SaveSlot[]> {
    const db = await getDb()
    return db.getAll(STORE_NAME)
  },

  async deleteSlot(slot: number): Promise<void> {
    const db = await getDb()
    await db.delete(STORE_NAME, slot)
  },
}
