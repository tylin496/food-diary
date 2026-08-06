import { useRef } from 'react'
import { Camera, Check, Pencil } from 'lucide-react'
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
  mountDelay: number
  removing: boolean
  justSelected: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
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
  mountDelay,
  removing,
  justSelected,
  onToggle,
  onEdit,
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

  const animation = `card-in 520ms var(--motion-entrance-bold) ${mountDelay}ms both${
    justSelected ? ', ring-pulse 550ms ease' : ''
  }`

  return (
    <div
      role="button"
      tabIndex={0}
      data-food-id={item.id}
      className={`food-card${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}${removing ? ' is-removing' : ''}`}
      style={{ animation }}
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
              {sub.name}
            </span>
          ))}
        </div>
      )}
      <div className="meta-row">
        <span className="stat-calories">{totals.calories} kcal</span>
        <span className="meta-secondary">
          {totals.weight > 0 && `${totals.weight} g · `}
          {totals.protein} g 蛋白質
        </span>
      </div>
    </div>
  )
}
