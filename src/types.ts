export interface FoodSubItem {
  id: string
  name: string
  weight: number
  protein: number
  calories: number
  selected: boolean
}

export interface FoodItem {
  id: string
  name: string
  imageUrl: string | null
  weight: number
  protein: number
  calories: number
  createdAt: number
  subItems?: FoodSubItem[]
}

export type FoodSubItemDraft = {
  id: string
  name: string
  weight: string
  protein: string
  calories: string
  selected: boolean
}

export type FoodDraft = {
  name: string
  imageUrl: string | null
  weight: string
  protein: string
  calories: string
  subItems: FoodSubItemDraft[]
}

export const emptyDraft: FoodDraft = {
  name: '',
  imageUrl: null,
  weight: '',
  protein: '',
  calories: '',
  subItems: [],
}

// A guest's local sub-item toggles never touch the shared record — this is the
// per-item override map (subId -> selected) layered on top of it for display/totals.
export type SubItemOverrides = Record<string, boolean>

export function isSubItemSelected(sub: FoodSubItem, overrides?: SubItemOverrides): boolean {
  return (overrides?.[sub.id] ?? sub.selected) !== false
}

export function getFoodTotals(
  item: FoodItem,
  overrides?: SubItemOverrides,
): { weight: number; protein: number; calories: number } {
  const subItems = (item.subItems ?? []).filter((sub) => isSubItemSelected(sub, overrides))
  return subItems.reduce(
    (acc, sub) => ({
      weight: acc.weight + sub.weight,
      protein: acc.protein + sub.protein,
      calories: acc.calories + sub.calories,
    }),
    { weight: item.weight, protein: item.protein, calories: item.calories },
  )
}
