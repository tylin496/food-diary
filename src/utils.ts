import type { FoodItem, SubItemOverrides } from './types'
import { getFoodTotals, getSubItemTotals } from './types'

export function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// Summing decimal inputs leaves float noise (124.20000000000002); one decimal
// place is also all the precision these values are ever entered with.
export function roundAmount(value: number): number {
  return Math.round(value * 10) / 10
}

export function formatAmount(value: number): string {
  return String(roundAmount(value))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatItemsAsText(
  items: FoodItem[],
  overridesByItem?: Record<string, SubItemOverrides>,
): string {
  const lines: string[] = []
  let totalWeight = 0
  let totalProtein = 0
  let totalCalories = 0

  items.forEach((item, index) => {
    const overrides = overridesByItem?.[item.id]
    const totals = getFoodTotals(item, overrides)
    totalWeight += totals.weight
    totalProtein += totals.protein
    totalCalories += totals.calories

    lines.push(`${index + 1}. ${item.name}`)
    lines.push(
      `   重量 ${formatAmount(totals.weight)}g / 蛋白質 ${formatAmount(totals.protein)}g / 熱量 ${formatAmount(totals.calories)}kcal`,
    )
    for (const sub of item.subItems ?? []) {
      const subTotals = getSubItemTotals(sub)
      lines.push(
        `   - ${sub.name}：重量 ${formatAmount(subTotals.weight)}g / 蛋白質 ${formatAmount(subTotals.protein)}g / 熱量 ${formatAmount(subTotals.calories)}kcal`,
      )
      for (const ing of sub.ingredients ?? []) {
        lines.push(
          `     · ${ing.name}：重量 ${formatAmount(ing.weight)}g / 蛋白質 ${formatAmount(ing.protein)}g / 熱量 ${formatAmount(ing.calories)}kcal`,
        )
      }
    }
  })

  if (items.length > 1) {
    lines.push('')
    lines.push(
      `總計：重量 ${formatAmount(totalWeight)}g / 蛋白質 ${formatAmount(totalProtein)}g / 熱量 ${formatAmount(totalCalories)}kcal`,
    )
  }

  return lines.join('\n')
}
