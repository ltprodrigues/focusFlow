import { useState } from 'react'

export function BudgetForm({ initialAmount, onSubmit, onSaved, onCancel, onSavingChange }) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '')
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Budget must be greater than zero')
      return
    }
    setError('')
    setSubmitError('')
    setSaving(true)
    onSavingChange?.(true)
    try {
      await onSubmit(parsed)
      onSaved?.()
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') setSubmitError('Could not save the budget. Try again.')
    } finally {
      setSaving(false)
      onSavingChange?.(false)
    }
  }

  return (
    <form className="assignment-form budget-form" onSubmit={handleSubmit} noValidate>
      <label>Monthly budget<input name="amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError('') }} aria-describedby={error ? 'budget-amount-error' : undefined} /></label>
      {error && <p className="field-error" id="budget-amount-error">{error}</p>}
      {submitError && <p className="form-error" role="alert">{submitError}</p>}
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save budget'}</button>
      </div>
    </form>
  )
}
