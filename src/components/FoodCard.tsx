import { Camera, Check, Pencil, Trash2 } from 'lucide-react'
import type { FoodItem } from '../types'
import { getFoodTotals } from '../types'

interface FoodCardProps {
  item: FoodItem
  selected: boolean
  grayscale: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function FoodCard({ item, selected, grayscale, onToggle, onEdit, onDelete }: FoodCardProps) {
  const totals = getFoodTotals(item)
  const subItems = item.subItems ?? []
  return (
    <div
      role="button"
      tabIndex={0}
      className={`food-card${selected ? ' is-selected' : ''}`}
      onClick={() => onToggle(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(item.id)
        }
      }}
      aria-pressed={selected}
    >
      <div className="photo">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className={grayscale ? '' : 'no-grayscale'} />
        ) : (
          <Camera size={28} className="placeholder-icon" />
        )}
        {selected && (
          <div className="selected-badge">
            <Check size={14} strokeWidth={2.5} />
          </div>
        )}
        <div className="card-actions">
          <button
            type="button"
            aria-label="編輯"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item.id)
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label="刪除"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="food-name">{item.name}</div>
      {subItems.length > 0 && (
        <div className="sub-items-summary">
          {subItems.map((sub) => (
            <span className="sub-item-chip" key={sub.id}>
              {sub.imageUrl && <img src={sub.imageUrl} alt={sub.name} />}
              {sub.name}
            </span>
          ))}
        </div>
      )}
      <div className="meta-row">
        {totals.weight > 0 && <span className="tag tag-neutral">{totals.weight} g</span>}
        <span className="tag tag-accent">{totals.protein} g 蛋白質</span>
        <span className="tag tag-outline">{totals.calories} kcal</span>
      </div>
    </div>
  )
}
