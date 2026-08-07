import { useRef, useState } from 'react'
import { Camera, Check, Pencil } from 'lucide-react'
import type { FoodItem } from '../types'
import { getFoodTotals } from '../types'
import { formatAmount } from '../utils'

const LONG_PRESS_MS = 450
const LONG_PRESS_MOVE_TOLERANCE = 10

interface FoodCardProps {
  item: FoodItem
  selected: boolean
  grayscale: boolean
  readOnly: boolean
  reorderEnabled: boolean
  dragging: boolean
  removing: boolean
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
  removing,
  onToggle,
  onEdit,
  onToggleSubItem,
  onDragHandlePointerDown,
}: FoodCardProps) {
  const totals = getFoodTotals(item)
  const subItems = item.subItems ?? []
  // Without sub-items the weight itself labels the portion, so it becomes the
  // lone chip instead of being repeated in the meta row.
  const weightAsSubItem = subItems.length === 0 && item.weight > 0

  const longPressTimer = useRef<number | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const longPressFired = useRef(false)
  // Set when a move-past-tolerance turns out to be a scroll attempt rather than
  // a long-press-drag, so the click that pointerup still synthesizes gets eaten
  // instead of toggling the card.
  const suppressClick = useRef(false)
  // touch-action: none (below) stops the browser from ever taking over the
  // gesture as a native scroll, so once we decide it's a scroll we have to
  // replay it by hand onto the page scroller.
  const scrolling = useRef(false)
  const scrollTarget = useRef<HTMLElement | null>(null)
  const lastPointerY = useRef(0)
  const lastPointerType = useRef<string>('mouse')
  const [holding, setHolding] = useState(false)

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pointerStart.current = null
    scrolling.current = false
    setHolding(false)
  }

  const handlePhotoPointerDown = (e: React.PointerEvent) => {
    lastPointerType.current = e.pointerType
    suppressClick.current = false
    if (!reorderEnabled) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
    lastPointerY.current = e.clientY
    setHolding(true)
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null
      longPressFired.current = true
      setHolding(false)
      onDragHandlePointerDown(item.id, e)
    }, LONG_PRESS_MS)
  }

  const handlePhotoPointerMove = (e: React.PointerEvent) => {
    if (scrolling.current) {
      scrollTarget.current?.scrollBy(0, lastPointerY.current - e.clientY)
      lastPointerY.current = e.clientY
      return
    }
    if (!pointerStart.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) {
      clearLongPress()
      if (e.pointerType !== 'mouse') {
        suppressClick.current = true
        scrolling.current = true
        lastPointerY.current = e.clientY
        scrollTarget.current = (e.target as HTMLElement).closest<HTMLElement>('.page-scroll')
        scrollTarget.current?.scrollBy(0, -dy)
      }
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-food-id={item.id}
      className={`food-card${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}${removing ? ' is-removing' : ''}`}
      onClick={() => {
        if (longPressFired.current) {
          longPressFired.current = false
          return
        }
        if (suppressClick.current) {
          suppressClick.current = false
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
        className={`photo${holding ? ' is-holding' : ''}`}
        style={reorderEnabled ? { touchAction: 'none' } : undefined}
        onPointerDown={handlePhotoPointerDown}
        onPointerMove={handlePhotoPointerMove}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(e) => {
          // Only suppress the OS long-press menu (touch/pen) that would fight the
          // drag gesture; real right-clicks should still offer "Save image as…".
          if (reorderEnabled && lastPointerType.current !== 'mouse') e.preventDefault()
        }}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={grayscale ? '' : 'no-grayscale'}
            draggable={false}
          />
        ) : (
          <Camera size={26} strokeWidth={1.8} className="placeholder-icon" />
        )}
        {selected && (
          <div className="selected-badge">
            <Check size={13} strokeWidth={3} />
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
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="food-name">{item.name}</div>
        {weightAsSubItem && (
          <div className="sub-items-summary">
            <span className="sub-item-chip">{formatAmount(item.weight)} g</span>
          </div>
        )}
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
          <span>
            <span className="stat-calories">{formatAmount(totals.calories)}</span>
            <span className="stat-calories-unit">kcal</span>
          </span>
          <span className="meta-secondary">蛋白 {formatAmount(totals.protein)} g</span>
        </div>
      </div>
    </div>
  )
}
