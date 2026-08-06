import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Plus, Search } from 'lucide-react'
import { useLocalStorage } from './useLocalStorage'
import type { FoodDraft, FoodItem } from './types'
import { emptyDraft, getFoodTotals } from './types'
import { FoodCard } from './components/FoodCard'
import { SelectionBar } from './components/SelectionBar'
import { FoodModal } from './components/FoodModal'
import { formatItemsAsText, generateId, toNumber } from './utils'

const GRAYSCALE_PHOTOS = false

export default function App() {
  const [items, setItems] = useLocalStorage<FoodItem[]>('food-diary:items', [])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FoodDraft>(emptyDraft)

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt)
    if (!q) return sorted
    return sorted.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, search])

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
      if (!(e.key === 'a' || e.key === 'A') || !(e.metaKey || e.ctrlKey)) return
      const target = e.target as HTMLElement | null
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (isEditable || modalOpen) return
      e.preventDefault()
      selectAll()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredItems, modalOpen])

  const mergeSelected = () => {
    if (selectedItems.length < 2) return
    if (!window.confirm(`確定要將這 ${selectedItems.length} 項合併成一筆紀錄嗎？合併後個別項目將消失，但照片與數值會保留為子項目。`)) return

    const [base, ...rest] = selectedItems
    const mergedSubItems = [
      ...(base.subItems ?? []),
      ...rest.flatMap((item) => [
        {
          id: generateId(),
          name: item.name,
          imageUrl: item.imageUrl,
          weight: item.weight,
          protein: item.protein,
          calories: item.calories,
        },
        ...(item.subItems ?? []),
      ]),
    ]
    const removeIds = new Set(rest.map((item) => item.id))

    setItems((prev) =>
      prev
        .filter((item) => !removeIds.has(item.id))
        .map((item) => (item.id === base.id ? { ...item, subItems: mergedSubItems } : item)),
    )
    setSelectedIds(new Set())
  }

  const openAddModal = () => {
    setEditingId(null)
    setActiveId(generateId())
    setDraft(emptyDraft)
    setModalOpen(true)
  }

  const openEditModal = (id: string) => {
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
        <button type="button" className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} />
          新增食物
        </button>
      </nav>

      <main className="main">
        {!hasAnyItems && (
          <div className="empty-state">
            <ImageIcon size={48} />
            <h3>還沒有任何紀錄</h3>
            <p className="text-muted">拍下食物照片，記錄重量、蛋白質與熱量，開始建立你的資料庫</p>
            <button type="button" className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              新增第一筆紀錄
            </button>
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
                onToggle={toggleSelect}
                onEdit={openEditModal}
                onDelete={deleteItem}
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
        onMerge={mergeSelected}
        onCopy={copySelectedAsText}
        hideMerge={modalOpen && editingId !== null}
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
        />
      )}
    </>
  )
}
