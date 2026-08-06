import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface SelectionBarProps {
  count: number
  totalWeight: number
  totalProtein: number
  totalCalories: number
  onClear: () => void
  onCopy: () => void
}

export function SelectionBar({
  count,
  totalWeight,
  totalProtein,
  totalCalories,
  onClear,
  onCopy,
}: SelectionBarProps) {
  const [copied, setCopied] = useState(false)
  const visible = count > 0
  const [rendered, setRendered] = useState(visible)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      return
    }
    if (!rendered) return
    const timer = setTimeout(() => setRendered(false), 200)
    return () => clearTimeout(timer)
  }, [visible, rendered])

  if (!rendered) return null

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`selection-bar${visible ? '' : ' is-leaving'}`}>
      <div className="selected-count">已選 {count} 項</div>
      <div className="stats">
        <div className="stat">
          <div className="value">{totalCalories}</div>
          <div className="label">熱量 (kcal)</div>
        </div>
        <div className="stat">
          <div className="value">{totalWeight}</div>
          <div className="label">重量 (g)</div>
        </div>
        <div className="stat">
          <div className="value">{totalProtein}</div>
          <div className="label">蛋白質 (g)</div>
        </div>
      </div>
      <button
        type="button"
        className={`btn btn-clear btn-icon${copied ? ' is-copied' : ''}`}
        onClick={handleCopy}
        aria-label={copied ? '已複製' : '複製成文字'}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button type="button" className="btn btn-clear" onClick={onClear}>
        清除選取
      </button>
    </div>
  )
}
