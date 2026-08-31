import { useEffect, useId, useRef } from 'react'

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Dialog({ open, title, onClose, children, className = '' }) {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement
    panelRef.current?.querySelector(focusableSelector)?.focus()
    return () => {
      previouslyFocused?.focus()
    }
  }, [open])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...panelRef.current.querySelectorAll(focusableSelector)]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div className="dialog-backdrop" onKeyDown={handleKeyDown} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`dialog-panel ${className}`.trim()} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button className="dialog-close" type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  )
}
