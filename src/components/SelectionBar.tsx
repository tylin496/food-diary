import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface SelectionBarProps {
  count: number
  totalWeight: number
  totalProtein: number
  totalCalories: number
  onClear: () => void
  onCopy: () => void
}

const TWEEN_DURATION = 520
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function useTweenedValue(target: number) {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const targetRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === targetRef.current) return
    targetRef.current = target

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      displayRef.current = target
      setDisplay(target)
      return
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    const from = displayRef.current
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_DURATION)
      const next = from + (target - from) * easeOutCubic(t)
      displayRef.current = next
      setDisplay(next)
      rafRef.current = t < 1 ? requestAnimationFrame(step) : null
    }
    rafRef.current = requestAnimationFrame(step)
  }, [target])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return display
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

  const displayWeight = useTweenedValue(totalWeight)
  const displayProtein = useTweenedValue(totalProtein)
  const displayCalories = useTweenedValue(totalCalories)

  const prevCountRef = useRef(count)
  const [bumpParity, setBumpParity] = useState(0)
  useEffect(() => {
    if (prevCountRef.current !== count) {
      setBumpParity((p) => (p ? 0 : 1))
      prevCountRef.current = count
    }
  }, [count])

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
      <div className={`selected-count${bumpParity ? ' bump-a' : ' bump-b'}`}>已選 {count} 項</div>
      <div className="stats">
        <div className="stat">
          <div className="value">{Math.round(displayCalories)}</div>
          <div className="label">熱量 (kcal)</div>
        </div>
        <div className="stat">
          <div className="value">{Math.round(displayWeight)}</div>
          <div className="label">重量 (g)</div>
        </div>
        <div className="stat">
          <div className="value">{Math.round(displayProtein)}</div>
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
