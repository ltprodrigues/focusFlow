import { useEffect, useRef, useState } from 'react'
import { Dialog } from './Dialog'

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', errorMessage = 'Could not delete the assignment. Try again.', onConfirm, onCancel, fallbackFocusRef }) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')
  const mountedRef = useRef(false)
  const requestRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestRef.current += 1
    }
  }, [])

  async function handleConfirm() {
    if (isWorking) return
    const request = requestRef.current + 1
    requestRef.current = request
    setIsWorking(true)
    setError('')
    try {
      await onConfirm()
      if (mountedRef.current && requestRef.current === request) setIsWorking(false)
    } catch {
      if (mountedRef.current && requestRef.current === request) {
        setError(errorMessage)
        setIsWorking(false)
      }
    }
  }

  function handleCancel() {
    requestRef.current += 1
    setIsWorking(false)
    setError('')
    onCancel()
  }

  return (
    <Dialog open={open} title={title} onClose={handleCancel} className="confirm-dialog" dismissible={!isWorking} fallbackFocusRef={fallbackFocusRef}>
      <p>{message}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" onClick={handleCancel} disabled={isWorking}>Cancel</button>
        <button className="danger-button" type="button" onClick={handleConfirm} disabled={isWorking}>
          {isWorking ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
