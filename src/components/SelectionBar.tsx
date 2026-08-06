interface SelectionBarProps {
  count: number
  totalWeight: number
  totalProtein: number
  totalCalories: number
  onClear: () => void
  onMerge: () => void
}

export function SelectionBar({
  count,
  totalWeight,
  totalProtein,
  totalCalories,
  onClear,
  onMerge,
}: SelectionBarProps) {
  if (count === 0) return null

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
      {count >= 2 && (
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
