import { useMemo, useState } from 'react'
import { Image as ImageIcon, Plus, Search } from 'lucide-react'
import { useLocalStorage } from './useLocalStorage'
import type { FoodDraft, FoodItem } from './types'
import { emptyDraft } from './types'
import { FoodCard } from './components/FoodCard'
import { SelectionBar } from './components/SelectionBar'
import { FoodModal } from './components/FoodModal'

const GRAYSCALE_PHOTOS = true

function toNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function App() {
  const [items, setItems] = useLocalStorage<FoodItem[]>('food-diary:items', [])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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
        (acc, item) => ({
          weight: acc.weight + item.weight,
          protein: acc.protein + item.protein,
          calories: acc.calories + item.calories,
        }),
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

  const openAddModal = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setModalOpen(true)
  }

  const openEditModal = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    setEditingId(id)
    setDraft({
      name: item.name,
      imageUrl: item.imageUrl,
      weight: String(item.weight),
      protein: String(item.protein),
      calories: String(item.calories),
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setDraft(emptyDraft)
  }

  const handleSave = () => {
    if (draft.name.trim().length === 0) return
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
              }
            : item,
        ),
      )
    } else {
      const newItem: FoodItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: draft.name.trim(),
        imageUrl: draft.imageUrl,
        weight: toNumber(draft.weight),
        protein: toNumber(draft.protein),
        calories: toNumber(draft.calories),
        createdAt: Date.now(),
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
      />

      {modalOpen && (
        <FoodModal
          draft={draft}
          isEditing={editingId !== null}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={closeModal}
          onDelete={() => editingId && deleteItem(editingId)}
        />
      )}
    </>
  )
}
