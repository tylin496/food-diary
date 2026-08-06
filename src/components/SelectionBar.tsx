import { useState } from 'react'

interface SelectionBarProps {
  count: number
  totalWeight: number
  totalProtein: number
  totalCalories: number
  onClear: () => void
  onMerge: () => void
  onCopy: () => void
  hideMerge: boolean
}

export function SelectionBar({
  count,
  totalWeight,
  totalProtein,
  totalCalories,
  onClear,
  onMerge,
  onCopy,
  hideMerge,
}: SelectionBarProps) {
  const [copied, setCopied] = useState(false)

  if (count === 0) return null

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="selection-bar">
      <div className="selected-count">已選 {count} 項</div>
      <div className="stats">
        <div className="stat">
          <div className="value">{totalWeight}</div>
          <div className="label">重量 (g)</div>
        </div>
        <div className="stat">
          <div className="value">{totalProtein}</div>
          <div className="label">蛋白質 (g)</div>
        </div>
        <div className="stat">
          <div className="value">{totalCalories}</div>
          <div className="label">熱量 (kcal)</div>
        </div>
      </div>
      <button type="button" className="btn btn-clear" onClick={handleCopy}>
        {copied ? '已複製！' : '複製成文字'}
      </button>
      {count >= 2 && !hideMerge && (
        <button type="button" className="btn btn-clear" onClick={onMerge}>
          合併為一筆
        </button>
      )}
      <button type="button" className="btn btn-clear" onClick={onClear}>
        清除選取
      </button>
    </div>
  )
}
