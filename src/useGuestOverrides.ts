import { useEffect, useState } from 'react'
import type { SubItemOverrides } from './types'

// Guests (read-only viewers) can still tap sub-item chips to decide what counts
// for themselves, but they can't write to the shared record — so their choices
// live only in this browser's localStorage, layered on top of the real data.
const STORAGE_KEY = 'foodbook-guest-subitem-overrides'

type OverrideMap = Record<string, SubItemOverrides>

function readStored(): OverrideMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OverrideMap) : {}
  } catch {
    return {}
  }
}

export function useGuestOverrides() {
  const [overrides, setOverrides] = useState<OverrideMap>(readStored)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  }, [overrides])

  const toggle = (itemId: string, subId: string, baseSelected: boolean) => {
    setOverrides((prev) => {
      const itemOverrides = prev[itemId] ?? {}
      const current = itemOverrides[subId] ?? baseSelected
      return { ...prev, [itemId]: { ...itemOverrides, [subId]: !current } }
    })
  }

  return { overrides, toggle }
}
