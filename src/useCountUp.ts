import { useEffect, useRef, useState } from 'react'

const COUNT_UP_MS = 600
// ease-out quad
const ease = (t: number) => 1 - (1 - t) * (1 - t)

/** Tweens from whatever is currently on screen to `target`, not from 0. */
export function useCountUp(target: number): number {
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
      const t = Math.min(1, (now - start) / COUNT_UP_MS)
      const next = from + (target - from) * ease(t)
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
