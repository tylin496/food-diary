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
  const lastMoveTime = useRef(0)
  const velocityY = useRef(0)
  const momentumFrame = useRef<number | null>(null)
  const lastPointerType = useRef<string>('mouse')
  const [holding, setHolding] = useState(false)

  const stopMomentum = () => {
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current)
      momentumFrame.current = null
    }
  }

  // Native touch scrolling is blocked on this element (touch-action: none, below),
  // so once we take a gesture over as a manual scroll we also have to fake the
  // momentum/glide a real scroll would have had, or it just stops dead on release.
  const startMomentum = (target: HTMLElement, initialVelocity: number) => {
    let velocity = initialVelocity
    let lastTs: number | null = null
    const step = (ts: number) => {
      const dt = lastTs === null ? 16 : ts - lastTs
      lastTs = ts
      target.scrollBy(0, -velocity * dt)
      velocity *= Math.pow(0.95, dt / 16)
      momentumFrame.current = Math.abs(velocity) > 0.02 ? requestAnimationFrame(step) : null
    }
    momentumFrame.current = requestAnimationFrame(step)
  }

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
    stopMomentum()
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
      const now = performance.now()
      const dt = Math.max(1, now - lastMoveTime.current)
      const dy = lastPointerY.current - e.clientY
      scrollTarget.current?.scrollBy(0, dy)
      velocityY.current = -dy / dt
      lastPointerY.current = e.clientY
      lastMoveTime.current = now
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
        lastMoveTime.current = performance.now()
        velocityY.current = 0
        scrollTarget.current = (e.target as HTMLElement).closest<HTMLElement>('.page-scroll')
        scrollTarget.current?.scrollBy(0, -dy)
      }
    }
  }

  const handlePhotoPointerUp = () => {
    if (scrolling.current && scrollTarget.current) {
      startMomentum(scrollTarget.current, velocityY.current)
    }
    clearLongPress()
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
        onPointerUp={handlePhotoPointerUp}
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
            <span
              className={`sub-item-chip${subItems[0].selected === false ? ' is-excluded' : ''}${readOnly ? '' : ' is-toggleable'}`}
              onClick={
                readOnly
                  ? undefined
                  : (e) => {
                      e.stopPropagation()
                      onToggleSubItem(item.id, subItems[0].id)
                    }
              }
            >
              {subItems[0].name}
            </span>
            {subItems.length > 1 && <span className="sub-item-chip is-more">+{subItems.length - 1}</span>}
          </div>
        )}
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{formatAmount(totals.calories)}</div>
            <div className="stat-label">KCAL</div>
          </div>
          <div className="stat-rule" />
          <div className="stat">
            <div className="stat-value is-protein">{formatAmount(totals.protein)}</div>
            <div className="stat-label">蛋白 G</div>
          </div>
        </div>
      </div>
    </div>
  )
}
