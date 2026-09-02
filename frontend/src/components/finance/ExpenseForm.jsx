import { useEffect, useId, useRef, useState } from 'react'

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'School', 'Entertainment', 'Housing', 'Other']

function localDateValue(value) {
  if (!value) {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  return String(value).slice(0, 10)
}

function localDateToIso(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toISOString()
}

export function ExpenseForm({ initialExpense, onSubmit, onCancel, onSaved, onSavingChange }) {
  const titleErrorId = useId()
  const amountErrorId = useId()
  const categoryErrorId = useId()
  const dateErrorId = useId()
  const mountedRef = useRef(false)
  const savingRef = useRef(false)
  const [title, setTitle] = useState(initialExpense?.title || '')
  const [amount, setAmount] = useState(initialExpense?.amount == null ? '' : String(initialExpense.amount))
  const [category, setCategory] = useState(initialExpense?.category || '')
  const [date, setDate] = useState(() => localDateValue(initialExpense?.date))
  const [notes, setNotes] = useState(initialExpense?.notes || '')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return
    const parsedAmount = Number(amount)
    const nextErrors = {}
    if (!title.trim()) nextErrors.title = 'Title is required'
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) nextErrors.amount = 'Amount must be greater than zero'
    if (!category) nextErrors.category = 'Category is required'
    if (!date) nextErrors.date = 'Date is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSubmitError('')
    savingRef.current = true
    setSaving(true)
    onSavingChange?.(true)
    try {
      await onSubmit({ title: title.trim(), amount: parsedAmount, category, date: localDateToIso(date), notes: notes.trim() })
      if (mountedRef.current) onSaved?.()
    } catch (error) {
      if (mountedRef.current && error?.name !== 'AbortError') setSubmitError('Could not save the expense. Try again.')
    } finally {
      savingRef.current = false
      if (mountedRef.current) {
        setSaving(false)
        onSavingChange?.(false)
      }
    }
  }

  return (
    <form className="assignment-form expense-form" onSubmit={handleSubmit} noValidate>
      <label>Title<input aria-describedby={errors.title ? titleErrorId : undefined} aria-invalid={Boolean(errors.title)} value={title} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: '' })) }} /></label>
      {errors.title && <p className="field-error" id={titleErrorId}>{errors.title}</p>}
      <div className="expense-form-row">
        <div><label>Amount<input aria-describedby={errors.amount ? amountErrorId : undefined} aria-invalid={Boolean(errors.amount)} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setErrors((current) => ({ ...current, amount: '' })) }} /></label>{errors.amount && <p className="field-error" id={amountErrorId}>{errors.amount}</p>}</div>
        <div><label>Category<select aria-describedby={errors.category ? categoryErrorId : undefined} aria-invalid={Boolean(errors.category)} value={category} onChange={(event) => { setCategory(event.target.value); setErrors((current) => ({ ...current, category: '' })) }}><option value="">Select category</option>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>{errors.category && <p className="field-error" id={categoryErrorId}>{errors.category}</p>}</div>
      </div>
      <label>Date<input aria-describedby={errors.date ? dateErrorId : undefined} aria-invalid={Boolean(errors.date)} type="date" value={date} onChange={(event) => { setDate(event.target.value); setErrors((current) => ({ ...current, date: '' })) }} /></label>
      {errors.date && <p className="field-error" id={dateErrorId}>{errors.date}</p>}
      <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {submitError && <p className="form-error" role="alert">{submitError}</p>}
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save expense'}</button>
      </div>
    </form>
  )
}
