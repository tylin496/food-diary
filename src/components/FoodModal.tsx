import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { FoodDraft } from '../types'
import { uploadToCloudinary } from '../cloudinary'

interface FoodModalProps {
  draft: FoodDraft
  isEditing: boolean
  onChange: (draft: FoodDraft) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

export function FoodModal({ draft, isEditing, onChange, onSave, onCancel, onDelete }: FoodModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(draft.imageUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploadError(false)
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      onChange({ ...draft, imageUrl: url })
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
            <label htmlFor="food-weight">重量 (g)</label>
            <input
              id="food-weight"
              className="input"
              type="number"
              inputMode="decimal"
              value={draft.weight}
              onChange={(e) => onChange({ ...draft, weight: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label htmlFor="food-calories">熱量 (kcal)</label>
            <input
              id="food-calories"
              className="input"
              type="number"
              inputMode="decimal"
              value={draft.calories}
              onChange={(e) => onChange({ ...draft, calories: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label htmlFor="food-protein">蛋白質 (g)</label>
            <input
              id="food-protein"
              className="input"
              type="number"
              inputMode="decimal"
              value={draft.protein}
              onChange={(e) => onChange({ ...draft, protein: e.target.value })}
              placeholder="0"
            />
          </div>
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
              disabled={draft.name.trim().length === 0 || uploading}
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
