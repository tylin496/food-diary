import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { FoodItem } from './types'

const LOCAL_KEY = 'food-diary:items'

function readLocalCache(): FoodItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as FoodItem[]) : []
  } catch {
    return []
  }
}

function writeLocalCache(items: FoodItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
  } catch {
    // storage full or unavailable — Firestore remains source of truth
  }
}

function itemsDocRef(uid: string) {
  return doc(db, 'users', uid, 'data', 'foodItems')
}

/**
 * Mirrors the [value, setValue] shape of useLocalStorage, but backs onto a
 * single Firestore document per user so data survives cleared browser storage
 * and syncs across devices. localStorage is kept as an offline read cache.
 */
export function useCloudItems(uid: string) {
  const [items, setItemsState] = useState<FoodItem[]>(() => readLocalCache())
  const [loading, setLoading] = useState(true)
  const migratedRef = useRef(false)

  useEffect(() => {
    setLoading(true)
    migratedRef.current = false
    const ref = itemsDocRef(uid)
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const remote = (snap.data().items ?? []) as FoodItem[]
        setItemsState(remote)
        writeLocalCache(remote)
      } else if (!migratedRef.current) {
        // First time this account signs in: carry over whatever is already
        // sitting in this browser's localStorage instead of starting empty.
        migratedRef.current = true
        const local = readLocalCache()
        setDoc(ref, { items: local })
      }
      setLoading(false)
    })
    return unsubscribe
  }, [uid])

  const setItems = useCallback(
    (next: FoodItem[] | ((prev: FoodItem[]) => FoodItem[])) => {
      setItemsState((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: FoodItem[]) => FoodItem[])(prev) : next
        writeLocalCache(resolved)
        setDoc(itemsDocRef(uid), { items: resolved }).catch(() => {
          // offline — local cache holds the latest state; the Firestore
          // listener will resync once the connection comes back.
        })
        return resolved
      })
    },
    [uid],
  )

  return [items, setItems, loading] as const
}
