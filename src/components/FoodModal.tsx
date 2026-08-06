import { useRef, useState } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import type { FoodDraft, FoodSubItemDraft } from '../types'
import { uploadToCloudinary } from '../cloudinary'
import { generateId, toNumber } from '../utils'

interface FoodModalProps {
  itemId: string
  draft: FoodDraft
  isEditing: boolean
  onChange: (draft: FoodDraft) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  onImageUploaded: (id: string, url: string) => void
  onSubImageUploaded: (id: string, subId: string, url: string) => void
  mergeCandidateCount: number
  onMerge: () => void
}

export function FoodModal({
  itemId,
  draft,
  isEditing,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onImageUploaded,
  onSubImageUploaded,
  mergeCandidateCount,
  onMerge,
}: FoodModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(draft.imageUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(false)

  const [subUploading, setSubUploading] = useState<Record<string, boolean>>({})
  const [subPreviews, setSubPreviews] = useState<Record<string, string>>({})

  const addSubItem = () => {
    const newSubItem: FoodSubItemDraft = {
      id: generateId(),
      name: '',
      imageUrl: null,
      weight: '',
      protein: '',
      calories: '',
    }

    // First sub-item: split the manually-entered base numbers out into their
    // own row so the top fields can become a read-only auto-sum from here on.
    const hasBaseValues =
      draft.subItems.length === 0 &&
      (toNumber(draft.weight) > 0 || toNumber(draft.calories) > 0 || toNumber(draft.protein) > 0)
    if (hasBaseValues) {
      const baseSubItem: FoodSubItemDraft = {
        id: generateId(),
        name: draft.name.trim() || '本體',
        imageUrl: null,
        weight: draft.weight,
        protein: draft.protein,
        calories: draft.calories,
      }
      onChange({
        ...draft,
        weight: '0',
        calories: '0',
        protein: '0',
        subItems: [baseSubItem, newSubItem],
      })
      return
    }

    onChange({ ...draft, subItems: [...draft.subItems, newSubItem] })
  }

  const updateSubItem = (id: string, patch: Partial<FoodSubItemDraft>) => {
    onChange({
      ...draft,
      subItems: draft.subItems.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)),
    })
  }

  const removeSubItem = (id: string) => {
    onChange({ ...draft, subItems: draft.subItems.filter((sub) => sub.id !== id) })
  }

  const removeSubItemPhoto = (id: string) => {
    updateSubItem(id, { imageUrl: null })
    setSubPreviews((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleSubFileChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSubPreviews((prev) => ({ ...prev, [id]: URL.createObjectURL(file) }))
    setSubUploading((prev) => ({ ...prev, [id]: true }))
    try {
      const url = await uploadToCloudinary(file)
      updateSubItem(id, { imageUrl: url })
      onSubImageUploaded(itemId, id, url)
    } catch {
      // keep the local preview; draft.imageUrl stays untouched so a dead
      // blob: URL never gets persisted to storage
    } finally {
      setSubUploading((prev) => ({ ...prev, [id]: false }))
    }
  }

  const hasSubItems = draft.subItems.length > 0
  const totalWeight = toNumber(draft.weight) + draft.subItems.reduce((sum, sub) => sum + toNumber(sub.weight), 0)
  const totalCalories =
    toNumber(draft.calories) + draft.subItems.reduce((sum, sub) => sum + toNumber(sub.calories), 0)
  const totalProtein =
    toNumber(draft.protein) + draft.subItems.reduce((sum, sub) => sum + toNumber(sub.protein), 0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploadError(false)
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      onChange({ ...draft, imageUrl: url })
      onImageUploaded(itemId, url)
    } catch {
      setUploadError(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="dialog-backdrop"
      onClick={onCancel}
    >
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="dialog-title">{isEditing ? '編輯紀錄' : '新增紀錄'}</div>
          <button type="button" className="dialog-close" aria-label="關閉" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-photo-row">
          <div className="photo-upload-box" onClick={() => fileInputRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="食物照片預覽" />
            ) : (
              <>
                <Camera size={22} />
                <span>上傳照片</span>
              </>
            )}
            {uploading && <span>上傳中…</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <div className="field">
            {uploadError && (
              <div style={{ color: 'var(--color-accent)', fontSize: 12, marginBottom: 6 }}>
                照片上傳失敗，請重試
              </div>
            )}
            <label htmlFor="food-name">食物名稱</label>
            <input
              id="food-name"
              className="input"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="例如：雞胸肉"
            />
          </div>
        </div>

        <div className="number-fields">
          <div className="field">
            <label htmlFor="food-weight">重量 (g){hasSubItems && '・自動加總'}</label>
            <input
              id="food-weight"
              className="input"
              type="number"
              inputMode="decimal"
              value={hasSubItems ? totalWeight : draft.weight}
              disabled={hasSubItems}
              onChange={(e) => onChange({ ...draft, weight: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label htmlFor="food-calories">熱量 (kcal){hasSubItems && '・自動加總'}</label>
            <input
              id="food-calories"
              className="input"
              type="number"
              inputMode="decimal"
              value={hasSubItems ? totalCalories : draft.calories}
              disabled={hasSubItems}
              onChange={(e) => onChange({ ...draft, calories: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label htmlFor="food-protein">蛋白質 (g){hasSubItems && '・自動加總'}</label>
            <input
              id="food-protein"
              className="input"
              type="number"
              inputMode="decimal"
              value={hasSubItems ? totalProtein : draft.protein}
              disabled={hasSubItems}
              onChange={(e) => onChange({ ...draft, protein: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>

        {isEditing && mergeCandidateCount > 0 && (
          <div className="merge-hint">
            <span>已選取 {mergeCandidateCount} 項</span>
            <button type="button" className="btn-ghost" onClick={onMerge}>
              合併為子項目
            </button>
          </div>
        )}

        <div className="sub-items-section">
          <div className="sub-items-header">
            <span>子項目</span>
            <button type="button" className="btn-ghost btn-add-subitem" onClick={addSubItem}>
              <Plus size={14} />
              新增子項目
            </button>
          </div>

          {draft.subItems.length > 0 && (
            <div className="sub-items">
              {draft.subItems.map((sub) => (
                <div className="sub-item-row" key={sub.id}>
                  <div className="sub-item-row-top">
                    <label className="sub-item-photo">
                      {sub.imageUrl || subPreviews[sub.id] ? (
                        <img src={sub.imageUrl ?? subPreviews[sub.id]} alt={sub.name || '子項目照片'} />
                      ) : (
                        <Camera size={14} />
                      )}
                      {subUploading[sub.id] && <span className="sub-item-photo-uploading">上傳中</span>}
                      {(sub.imageUrl || subPreviews[sub.id]) && !subUploading[sub.id] && (
                        <button
                          type="button"
                          className="sub-item-photo-remove"
                          aria-label="移除子項目照片"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeSubItemPhoto(sub.id)
                          }}
                        >
                          <X size={10} />
                        </button>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleSubFileChange(sub.id, e)}
                      />
                    </label>
                    <input
                      className="input"
                      value={sub.name}
                      onChange={(e) => updateSubItem(sub.id, { name: e.target.value })}
                      placeholder="例如：加鯛魚"
                    />
                    <button
                      type="button"
                      className="sub-item-remove"
                      aria-label="刪除子項目"
                      onClick={() => removeSubItem(sub.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="sub-item-row-numbers">
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      value={sub.weight}
                      onChange={(e) => updateSubItem(sub.id, { weight: e.target.value })}
                      placeholder="重量 (g)"
                    />
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      value={sub.calories}
                      onChange={(e) => updateSubItem(sub.id, { calories: e.target.value })}
                      placeholder="熱量 (kcal)"
                    />
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      value={sub.protein}
                      onChange={(e) => updateSubItem(sub.id, { protein: e.target.value })}
                      placeholder="蛋白質 (g)"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialog-actions space-between">
          <div>
            {isEditing && (
              <button type="button" className="btn-delete-text" onClick={onDelete}>
                刪除
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={draft.name.trim().length === 0}
              onClick={onSave}
            >
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
