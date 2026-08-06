import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, LogOut, Moon, Plus, Search, Sun } from 'lucide-react'
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
    <FoodDiary
      isOwner={isOwner}
      userLabel={user?.displayName ?? user?.email ?? ''}
      onSignIn={signIn}
      onLogOut={logOut}
    />
  )
}

function FoodDiary({
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
  const { theme, toggleTheme } = useTheme()
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
  const dragStateRef = useRef<{ id: string } | null>(null)

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const dragging = dragStateRef.current
      if (!dragging) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const cardEl = el instanceof Element ? el.closest<HTMLElement>('[data-food-id]') : null
      const targetId = cardEl?.dataset.foodId
      if (!targetId || targetId === dragging.id) return
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
    [setItems],
  )

  const handlePointerUp = useCallback(() => {
    dragStateRef.current = null
    setDraggingId(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const handleDragHandlePointerDown = (id: string, e: React.PointerEvent) => {
    if (!reorderEnabled) return
    e.preventDefault()
    dragStateRef.current = { id }
    setDraggingId(id)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
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
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
        `確定要將這 ${mergeItems.length} 項合併進「${base.name}」嗎？合併後個別項目將消失，但照片與數值會保留為子項目。`,
      )
    )
      return

    const mergedSubItems = [
      ...(base.subItems ?? []),
      ...mergeItems.flatMap((item) => [
        {
          id: generateId(),
          name: item.name,
          imageUrl: item.imageUrl,
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
      imageUrl: sub.imageUrl,
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
            imageUrl: null,
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
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setActiveId(null)
    setDraft(emptyDraft)
  }

  const handleImageUploaded = (id: string, url: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, imageUrl: url } : item)))
  }

  const handleSubImageUploaded = (id: string, subId: string, url: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              subItems: (item.subItems ?? []).map((sub) =>
                sub.id === subId ? { ...sub, imageUrl: url } : sub,
              ),
            }
          : item,
      ),
    )
  }

  const handleSave = () => {
    if (draft.name.trim().length === 0) return
    const subItems = draft.subItems
      .filter((sub) => sub.name.trim().length > 0)
      .map((sub) => ({
        id: sub.id,
        name: sub.name.trim(),
        imageUrl: sub.imageUrl,
        weight: toNumber(sub.weight),
        protein: toNumber(sub.protein),
        calories: toNumber(sub.calories),
        selected: sub.selected,
      }))
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
      }
      setItems((prev) => [newItem, ...prev])
    }
    closeModal()
  }

  const deleteItem = (id: string) => {
    if (!isOwner) return
    if (!window.confirm('確定要刪除這筆紀錄嗎？')) return
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (editingId === id) closeModal()
  }

  const mergeCandidateIds = editingId
    ? selectedItems.filter((item) => item.id !== editingId).map((item) => item.id)
    : []

  const hasAnyItems = items.length > 0
  const hasResults = filteredItems.length > 0

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">食物熱量記錄</div>
        <div className="nav-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋食物名稱"
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          title={theme === 'dark' ? '切換為亮色模式' : '切換為暗色模式'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
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
          <div className="food-grid">
            {filteredItems.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                grayscale={GRAYSCALE_PHOTOS}
                readOnly={!isOwner}
                reorderEnabled={reorderEnabled}
                dragging={draggingId === item.id}
                onToggle={toggleSelect}
                onEdit={openEditModal}
                onDelete={deleteItem}
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
          onChange={setDraft}
          onSave={handleSave}
          onCancel={closeModal}
          onDelete={() => editingId && deleteItem(editingId)}
          onImageUploaded={handleImageUploaded}
          onSubImageUploaded={handleSubImageUploaded}
          mergeCandidateCount={mergeCandidateIds.length}
          onMerge={() => editingId && mergeIntoItem(editingId, mergeCandidateIds)}
        />
      )}
    </>
  )
}
