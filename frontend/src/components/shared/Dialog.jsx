import { useCallback, useEffect, useId, useRef } from 'react'

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Dialog({ open, title, onClose, children, className = '', active = true, dismissible = true, fallbackFocusRef }) {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    const fallbackFocus = fallbackFocusRef?.current
    return () => {
      queueMicrotask(() => {
        const target = previouslyFocused?.isConnected ? previouslyFocused : fallbackFocus
        target?.focus()
      })
    }
  }, [fallbackFocusRef, open])

  useEffect(() => {
    if (!open || !active) return
    const firstFocusable = panelRef.current?.querySelector(focusableSelector)
    ;(firstFocusable ?? panelRef.current)?.focus()
  }, [active, open])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (active && dismissible) onClose()
      return
    }
    if (!active || event.key !== 'Tab') return
    const focusable = [...panelRef.current.querySelectorAll(focusableSelector)]
    if (focusable.length === 0) {
      event.preventDefault()
      panelRef.current.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const focusIndex = focusable.indexOf(document.activeElement)
    if (focusIndex === -1) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [active, dismissible, onClose])

  useEffect(() => {
    if (!open || !active) return undefined
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, handleKeyDown, open])

  if (!open) return null

  return (
    <div
      className="dialog-backdrop"
      aria-hidden={active ? undefined : 'true'}
      inert={!active}
      onMouseDown={(event) => event.target === event.currentTarget && active && dismissible && onClose()}
    >
      <section className={`dialog-panel ${className}`.trim()} ref={panelRef} role="dialog" aria-modal={active ? 'true' : undefined} aria-labelledby={titleId} tabIndex={-1}>
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button className="dialog-close" type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose} disabled={!dismissible}>×</button>
        </header>
        {children}
      </section>
    </div>
  )
}
