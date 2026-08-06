import { useRef } from 'react'
import { Camera, Check, Pencil, Trash2 } from 'lucide-react'
import type { FoodItem } from '../types'
import { getFoodTotals } from '../types'

const LONG_PRESS_MS = 450
const LONG_PRESS_MOVE_TOLERANCE = 10

interface FoodCardProps {
  item: FoodItem
  selected: boolean
  grayscale: boolean
  readOnly: boolean
  reorderEnabled: boolean
  dragging: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleSubItem: (id: string, subId: string) => void
  onDragHandlePointerDown: (id: string, e: React.PointerEvent) => void
}

export function FoodCard({
  item,
  selected,
  grayscale,
  readOnly,
  reorderEnabled,
  dragging,
  onToggle,
  onEdit,
  onDelete,
  onToggleSubItem,
  onDragHandlePointerDown,
}: FoodCardProps) {
  const totals = getFoodTotals(item)
  const subItems = item.subItems ?? []

  const longPressTimer = useRef<number | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const longPressFired = useRef(false)

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pointerStart.current = null
  }

  const handlePhotoPointerDown = (e: React.PointerEvent) => {
    if (!reorderEnabled) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null
      longPressFired.current = true
      onDragHandlePointerDown(item.id, e)
    }, LONG_PRESS_MS)
  }

  const handlePhotoPointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) {
      clearLongPress()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-food-id={item.id}
      className={`food-card${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
      onClick={() => {
        if (longPressFired.current) {
          longPressFired.current = false
          return
        }
        onToggle(item.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(item.id)
        }
      }}
      aria-pressed={selected}
    >
      <div
        className="photo"
        onPointerDown={handlePhotoPointerDown}
        onPointerMove={handlePhotoPointerMove}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(e) => {
          if (reorderEnabled) e.preventDefault()
        }}
      >
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
        {!readOnly && (
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
        )}
      </div>
      <div className="food-name">{item.name}</div>
      {subItems.length > 0 && (
        <div className="sub-items-summary">
          {subItems.map((sub) => (
            <span
              className={`sub-item-chip${sub.selected === false ? ' is-excluded' : ''}${readOnly ? '' : ' is-toggleable'}`}
              key={sub.id}
              onClick={
                readOnly
                  ? undefined
                  : (e) => {
                      e.stopPropagation()
                      onToggleSubItem(item.id, sub.id)
                    }
              }
            >
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
