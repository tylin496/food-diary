export interface FoodItem {
  id: string
  name: string
  imageUrl: string | null
  weight: number
  protein: number
  calories: number
  createdAt: number
}

export type FoodDraft = {
  name: string
  imageUrl: string | null
  weight: string
  protein: string
  calories: string
}

export const emptyDraft: FoodDraft = {
  name: '',
  imageUrl: null,
  weight: '',
  protein: '',
  calories: '',
}
