import { useState } from 'react'
import { Dialog } from './Dialog'

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, fallbackFocusRef }) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setIsWorking(true)
    setError('')
    try {
      await onConfirm()
      setIsWorking(false)
    } catch {
      setError('Could not delete the assignment. Try again.')
      setIsWorking(false)
    }
  }

  function handleCancel() {
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
