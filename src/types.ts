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

export function getFoodTotals(item: FoodItem): { weight: number; protein: number; calories: number } {
  const subItems = (item.subItems ?? []).filter((sub) => sub.selected !== false)
  return subItems.reduce(
    (acc, sub) => ({
      weight: acc.weight + sub.weight,
      protein: acc.protein + sub.protein,
      calories: acc.calories + sub.calories,
    }),
    { weight: item.weight, protein: item.protein, calories: item.calories },
  )
}
