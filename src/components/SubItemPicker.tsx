import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { FoodItem } from '../types'

interface SubItemPickerProps {
  item: FoodItem
  onConfirm: (chosenIds: string[]) => void
  onCancel: () => void
}

export function SubItemPicker({ item, onConfirm, onCancel }: SubItemPickerProps) {
  const subItems = item.subItems ?? []
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(subItems.filter((sub) => sub.selected !== false).map((sub) => sub.id)),
  )
  const [closing, setClosing] = useState(false)

  // Mirrors closeModal() in App: let the exit animation play before unmounting.
  const dismiss = (run: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(run, 180)
  }

  const toggle = (id: string) => {
    setChosen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totals = subItems
    .filter((sub) => chosen.has(sub.id))
    .reduce(
      (acc, sub) => ({
        weight: acc.weight + sub.weight,
        protein: acc.protein + sub.protein,
        calories: acc.calories + sub.calories,
      }),
      { weight: item.weight, protein: item.protein, calories: item.calories },
    )

  return (
    <div className={`dialog-backdrop${closing ? ' is-closing' : ''}`}>
      <div
        className={`dialog${closing ? ' is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          dismiss(() => onConfirm([...chosen]))
        }}
      >
        <div className="dialog-header">
          <div className="dialog-title">{item.name}</div>
          <button type="button" className="dialog-close" aria-label="關閉" onClick={() => dismiss(onCancel)}>
            <X size={20} />
          </button>
        </div>

        <div className="picker-list">
          {subItems.map((sub) => {
            const isChosen = chosen.has(sub.id)
            return (
              <button
                type="button"
                key={sub.id}
                className={`picker-row${isChosen ? ' is-chosen' : ''}`}
                aria-pressed={isChosen}
                onClick={() => toggle(sub.id)}
              >
                <span className="picker-check">
                  {isChosen && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="picker-name">{sub.name || '未命名'}</span>
                <span className="picker-stats">
                  {sub.calories} kcal
                  {sub.protein > 0 && ` · ${sub.protein} g`}
                </span>
              </button>
            )
          })}
        </div>

        <div className="picker-total">
          <span className="picker-total-calories">{totals.calories} kcal</span>
          <span className="picker-total-secondary">
            {totals.weight > 0 && `${totals.weight} g · `}
            {totals.protein} g 蛋白質
          </span>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={() => dismiss(onCancel)}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={chosen.size === 0}
            onClick={() => dismiss(() => onConfirm([...chosen]))}
          >
            加入
          </button>
        </div>
      </div>
    </div>
  )
}
