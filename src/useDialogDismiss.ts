import { useEffect, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

// Shared dismiss behaviour for the dialogs: Esc anywhere, or a click on the
// dark backdrop. Returns props to spread onto the `.dialog-backdrop` element.
export function useDialogDismiss(onDismiss: () => void) {
  // Kept in a ref so the key listener is installed once and still calls the
  // latest handler (the dialogs re-render on every keystroke).
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      dismissRef.current()
    }
    // On document, so Esc works wherever focus happens to sit.
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // A press that starts inside the dialog (e.g. dragging to select text) still
  // fires a click on the backdrop when released out there — only dismiss when
  // both ends of the press were on the backdrop itself.
  const pressStartedOnBackdrop = useRef(false)

  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      pressStartedOnBackdrop.current = e.target === e.currentTarget
    },
    onClick: (e: MouseEvent<HTMLDivElement>) => {
      if (!pressStartedOnBackdrop.current || e.target !== e.currentTarget) return
      dismissRef.current()
    },
  }
}
