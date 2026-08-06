import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, LogOut, Plus, Search } from 'lucide-react'
import { useAuth } from './useAuth'
import { useTheme } from './useTheme'
import { useCloudItems } from './useCloudItems'
import type { FoodDraft, FoodItem } from './types'
import { emptyDraft, getFoodTotals } from './types'
import { FoodCard } from './components/FoodCard'
import { SelectionBar } from './components/SelectionBar'
import { FoodModal } from './components/FoodModal'
import { formatItemsAsText, generateId, toNumber } from './utils'

const GRAYSCALE_PHOTOS = false
const OWNER_UID = '277SEyYGZyUyapmKB5Fu4OC4dDR2'

export default function App() {
  const { user, loading: authLoading, signIn, logOut } = useAuth()

  if (authLoading) return null

  const isOwner = user?.uid === OWNER_UID

  return (
    <FoodBook
      isOwner={isOwner}
      userLabel={user?.displayName ?? user?.email ?? ''}
      onSignIn={signIn}
      onLogOut={logOut}
    />
  )
}

function FoodBook({
  isOwner,
  userLabel,
  onSignIn,
  onLogOut,
}: {
  isOwner: boolean
  userLabel: string
  onSignIn: () => void
  onLogOut: () => void
}) {
  const [items, setItems, itemsLoading] = useCloudItems(OWNER_UID)
  useTheme()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FoodDraft>(emptyDraft)

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, search])

  const reorderEnabled = isOwner && search.trim().length === 0
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [justSelectedId, setJustSelectedId] = useState<string | null>(null)
  const [modalClosing, setModalClosing] = useState(false)

  const foodGridRef = useRef<HTMLDivElement>(null)
  const prevRectsRef = useRef<Record<string, DOMRect> | null>(null)
  const mountDelaysRef = useRef<Map<string, number>>(new Map())
  const mountDelaysCapturedRef = useRef(false)
  const dragMetaRef = useRef<{ id: string; grabOffsetX: number; grabOffsetY: number } | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const selectPulseTimerRef = useRef<number | null>(null)

  if (!mountDelaysCapturedRef.current && !itemsLoading) {
    items.forEach((item, i) => {
      if (!mountDelaysRef.current.has(item.id)) mountDelaysRef.current.set(item.id, i * 55)
    })
    mountDelaysCapturedRef.current = true
  }

  const findCardEl = useCallback((id: string): HTMLElement | null => {
    const grid = foodGridRef.current
    if (!grid) return null
    return grid.querySelector<HTMLElement>(`[data-food-id="${CSS.escape(id)}"]`)
  }, [])

  const captureRects = useCallback((excludeId?: string) => {
    const grid = foodGridRef.current
    if (!grid) return
    const rects: Record<string, DOMRect> = {}
    grid.querySelectorAll<HTMLElement>('[data-food-id]').forEach((el) => {
      const id = el.dataset.foodId
      if (id && id !== excludeId) rects[id] = el.getBoundingClientRect()
    })
    prevRectsRef.current = rects
  }, [])

  const updateDragTransform = useCallback((el: HTMLElement, clientX: number, clientY: number) => {
    const meta = dragMetaRef.current
    if (!meta) return
    const saved = el.style.transform
    el.style.transform = ''
    const rect = el.getBoundingClientRect()
    el.style.transform = saved
    const dx = clientX - meta.grabOffsetX - rect.left
    const dy = clientY - meta.grabOffsetY - rect.top
    el.style.transform = `translate(${dx}px,${dy}px) scale(1.06) rotate(${dx > 0 ? 2 : -2}deg)`
  }, [])

  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prevRectsRef.current) {
      const rects = prevRectsRef.current
      prevRectsRef.current = null
      const dragId = dragMetaRef.current?.id
      if (!reducedMotion) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            Object.keys(rects).forEach((id) => {
              if (id === dragId) return
              const el = findCardEl(id)
              if (!el) return
              const prev = rects[id]
              const now = el.getBoundingClientRect()
              const dx = prev.left - now.left
              const dy = prev.top - now.top
              if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
              el.style.transition = 'none'
              el.style.transform = `translate(${dx}px,${dy}px)`
              requestAnimationFrame(() => {
                el.style.transition = 'transform var(--motion-flip-bold)'
                el.style.transform = ''
                const handleEnd = () => {
                  el.style.transition = ''
                  el.removeEventListener('transitionend', handleEnd)
                }
                el.addEventListener('transitionend', handleEnd)
              })
            })
          })
        })
      }
    }

    if (dragMetaRef.current) {
      const el = findCardEl(dragMetaRef.current.id)
      if (el) updateDragTransform(el, lastPointerRef.current.x, lastPointerRef.current.y)
    }
  })

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const dragging = dragMetaRef.current
      if (!dragging) return
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      const el = findCardEl(dragging.id)
      if (el) updateDragTransform(el, e.clientX, e.clientY)

      const under = document.elementFromPoint(e.clientX, e.clientY)
      const cardEl = under instanceof Element ? under.closest<HTMLElement>('[data-food-id]') : null
      const targetId = cardEl?.dataset.foodId
      if (!targetId || targetId === dragging.id) return
      captureRects(dragging.id)
      setItems((prev) => {
        const fromIndex = prev.findIndex((item) => item.id === dragging.id)
        const toIndex = prev.findIndex((item) => item.id === targetId)
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      })
    },
    [setItems, findCardEl, updateDragTransform, captureRects],
  )

  const handlePointerUp = useCallback(() => {
    const meta = dragMetaRef.current
    if (meta) {
      const el = findCardEl(meta.id)
      if (el) {
        el.style.transition = 'transform var(--motion-flip-bold)'
        el.style.transform = ''
        window.setTimeout(() => {
          el.style.boxShadow = ''
          el.style.zIndex = ''
          el.style.transition = ''
        }, 340)
      }
    }
    dragMetaRef.current = null
    setDraggingId(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [findCardEl])

  const handleDragHandlePointerDown = (id: string, e: React.PointerEvent) => {
    if (!reorderEnabled) return
    e.preventDefault()
    const el = findCardEl(id)
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragMetaRef.current = {
      id,
      grabOffsetX: e.clientX - rect.left,
      grabOffsetY: e.clientY - rect.top,
    }
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    el.style.transition = 'none'
    el.style.zIndex = '60'
    el.style.boxShadow = 'var(--shadow-lg)'
    updateDragTransform(el, e.clientX, e.clientY)
    setDraggingId(id)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      if (selectPulseTimerRef.current !== null) window.clearTimeout(selectPulseTimerRef.current)
    }
  }, [handlePointerMove, handlePointerUp])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds],
  )
  const totals = useMemo(
    () =>
      selectedItems.reduce(
        (acc, item) => {
          const itemTotals = getFoodTotals(item)
          return {
            weight: acc.weight + itemTotals.weight,
            protein: acc.protein + itemTotals.protein,
            calories: acc.calories + itemTotals.calories,
          }
        },
        { weight: 0, protein: 0, calories: 0 },
      ),
    [selectedItems],
  )

  const toggleSelect = (id: string) => {
    const wasSelected = selectedIds.has(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (!wasSelected) {
      setJustSelectedId(id)
      if (selectPulseTimerRef.current !== null) window.clearTimeout(selectPulseTimerRef.current)
      selectPulseTimerRef.current = window.setTimeout(() => setJustSelectedId(null), 600)
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectAll = () => setSelectedIds(new Set(filteredItems.map((item) => item.id)))

  const copySelectedAsText = () => {
    navigator.clipboard.writeText(formatItemsAsText(selectedItems))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const isSelectAll = e.key === 'a' || e.key === 'A'
      const isDeselect = e.key === 'd' || e.key === 'D'
      if (!isSelectAll && !isDeselect) return
      const target = e.target as HTMLElement | null
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (isEditable || modalOpen) return
      e.preventDefault()
      if (isSelectAll) selectAll()
      else clearSelection()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredItems, modalOpen])

  const mergeIntoItem = (baseId: string, mergeIds: string[]) => {
    if (!isOwner || mergeIds.length === 0) return
    const base = items.find((item) => item.id === baseId)
    if (!base) return
    const mergeItems = items.filter((item) => mergeIds.includes(item.id))
    if (
      !window.confirm(
        `確定要將這 ${mergeItems.length} 項合併進「${base.name}」嗎？合併後個別項目將消失，但數值會保留為子項目。`,
      )
    )
      return

    const mergedSubItems = [
      ...(base.subItems ?? []),
      ...mergeItems.flatMap((item) => [
        {
          id: generateId(),
          name: item.name,
          weight: item.weight,
          protein: item.protein,
          calories: item.calories,
          selected: true,
        },
        ...(item.subItems ?? []),
      ]),
    ]
    const removeIds = new Set(mergeIds)

    setItems((prev) =>
      prev
        .filter((item) => !removeIds.has(item.id))
        .map((item) => (item.id === baseId ? { ...item, subItems: mergedSubItems } : item)),
    )
    setSelectedIds(new Set())
    closeModal()
  }

  const openAddModal = () => {
    if (!isOwner) return
    setEditingId(null)
    setActiveId(generateId())
    setDraft(emptyDraft)
    setModalOpen(true)
  }

  const openEditModal = (id: string) => {
    if (!isOwner) return
    const item = items.find((i) => i.id === id)
    if (!item) return
    setEditingId(id)
    setActiveId(id)

    const existingSubItems = (item.subItems ?? []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      weight: String(sub.weight),
      protein: String(sub.protein),
      calories: String(sub.calories),
      selected: sub.selected !== false,
    }))
    // Legacy records may still carry their own base numbers alongside sub-items;
    // split them out into a row so the top fields can show a clean auto-sum.
    const hasBaseValues = item.weight > 0 || item.calories > 0 || item.protein > 0
    const shouldSplitBase = existingSubItems.length > 0 && hasBaseValues
    const subItems = shouldSplitBase
      ? [
          {
            id: generateId(),
            name: item.name,
            weight: String(item.weight),
            protein: String(item.protein),
            calories: String(item.calories),
            selected: true,
          },
          ...existingSubItems,
        ]
      : existingSubItems

    setDraft({
      name: item.name,
      imageUrl: item.imageUrl,
      weight: shouldSplitBase ? '0' : String(item.weight),
      protein: shouldSplitBase ? '0' : String(item.protein),
      calories: shouldSplitBase ? '0' : String(item.calories),
      subItems,
      subItemsExclusive: item.subItemsExclusive ?? false,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (modalClosing) return
    setModalClosing(true)
    window.setTimeout(() => {
      setModalOpen(false)
      setModalClosing(false)
      setEditingId(null)
      setActiveId(null)
      setDraft(emptyDraft)
    }, 180)
  }

  const handleImageUploaded = (id: string, url: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, imageUrl: url } : item)))
  }

  const toggleSubItemSelected = (id: string, subId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const subItems = item.subItems ?? []
        return {
          ...item,
          subItems: item.subItemsExclusive
            ? subItems.map((sub) =>
                sub.id === subId ? { ...sub, selected: sub.selected === false } : { ...sub, selected: false },
              )
            : subItems.map((sub) =>
                sub.id === subId ? { ...sub, selected: sub.selected === false } : sub,
              ),
        }
      }),
    )
  }

  const handleSave = () => {
    if (draft.name.trim().length === 0) return
    const subItems = draft.subItems
      .filter((sub) => sub.name.trim().length > 0)
      .map((sub) => ({
        id: sub.id,
        name: sub.name.trim(),
        weight: toNumber(sub.weight),
        protein: toNumber(sub.protein),
        calories: toNumber(sub.calories),
        selected: sub.selected,
      }))
    captureRects()
    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: draft.name.trim(),
                imageUrl: draft.imageUrl,
                weight: toNumber(draft.weight),
                protein: toNumber(draft.protein),
                calories: toNumber(draft.calories),
                subItems,
                subItemsExclusive: draft.subItemsExclusive,
              }
            : item,
        ),
      )
    } else {
      const newItem: FoodItem = {
        id: activeId ?? generateId(),
        name: draft.name.trim(),
        imageUrl: draft.imageUrl,
        weight: toNumber(draft.weight),
        protein: toNumber(draft.protein),
        calories: toNumber(draft.calories),
        createdAt: Date.now(),
        subItems,
        subItemsExclusive: draft.subItemsExclusive,
      }
      setItems((prev) => [newItem, ...prev])
    }
    closeModal()
  }

  const deleteItem = (id: string) => {
    if (!isOwner) return
    if (!window.confirm('確定要刪除這筆紀錄嗎？')) return
    if (editingId === id) closeModal()
    if (removingIds.has(id)) return
    setRemovingIds((prev) => new Set(prev).add(id))
    window.setTimeout(() => {
      captureRects(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 230)
  }

  const mergeCandidateIds = editingId
    ? selectedItems.filter((item) => item.id !== editingId).map((item) => item.id)
    : []

  const hasAnyItems = items.length > 0
  const hasResults = filteredItems.length > 0

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">Foodbook</div>
        <div className="nav-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => {
              captureRects()
              setSearch(e.target.value)
            }}
            placeholder="搜尋食物名稱"
          />
        </div>
        {isOwner ? (
          <>
            <button type="button" className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              新增食物
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              title={`登出 ${userLabel}`}
              onClick={onLogOut}
            >
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onSignIn}>
            使用 Google 登入
          </button>
        )}
      </nav>

      <main className="main">
        {itemsLoading && !hasAnyItems && <div className="no-results">同步中…</div>}
        {!itemsLoading && !hasAnyItems && (
          <div className="empty-state">
            <ImageIcon size={48} />
            <h3>還沒有任何紀錄</h3>
            <p className="text-muted">拍下食物照片，記錄重量、蛋白質與熱量，開始建立你的資料庫</p>
            {isOwner && (
              <button type="button" className="btn btn-primary" onClick={openAddModal}>
                <Plus size={16} />
                新增第一筆紀錄
              </button>
            )}
          </div>
        )}

        {hasAnyItems && !hasResults && (
          <div className="no-results">找不到符合「{search}」的紀錄</div>
        )}

        {hasAnyItems && hasResults && (
          <div className="food-grid" ref={foodGridRef}>
            {filteredItems.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                grayscale={GRAYSCALE_PHOTOS}
                readOnly={!isOwner}
                reorderEnabled={reorderEnabled}
                dragging={draggingId === item.id}
                mountDelay={mountDelaysRef.current.get(item.id) ?? 0}
                removing={removingIds.has(item.id)}
                justSelected={item.id === justSelectedId}
                onToggle={toggleSelect}
                onEdit={openEditModal}
                onToggleSubItem={toggleSubItemSelected}
                onDragHandlePointerDown={handleDragHandlePointerDown}
              />
            ))}
          </div>
        )}
      </main>

      <SelectionBar
        count={selectedItems.length}
        totalWeight={totals.weight}
        totalProtein={totals.protein}
        totalCalories={totals.calories}
        onClear={clearSelection}
        onCopy={copySelectedAsText}
      />

      {modalOpen && activeId && (
        <FoodModal
          itemId={activeId}
          draft={draft}
          isEditing={editingId !== null}
          closing={modalClosing}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={closeModal}
          onDelete={() => editingId && deleteItem(editingId)}
          onImageUploaded={handleImageUploaded}
          mergeCandidateCount={mergeCandidateIds.length}
          onMerge={() => editingId && mergeIntoItem(editingId, mergeCandidateIds)}
        />
      )}
    </>
  )
}
