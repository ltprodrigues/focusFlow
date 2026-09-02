import { useEffect, useRef, useState } from 'react'

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function initialValues(task) {
  return {
    title: task?.title ?? '',
    course: task?.course ?? '',
    dueDate: toLocalDateTime(task?.dueDate),
    priority: task?.priority ?? 'Medium',
    isCompleted: task?.isCompleted ?? false,
    notes: task?.notes ?? '',
  }
}

export function AssignmentForm({ initialTask, onSubmit, onDelete, onCancel, onSavingChange }) {
  const mountedRef = useRef(false)
  const savingRef = useRef(false)
  const [values, setValues] = useState(() => initialValues(initialTask))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  function updateValue(event) {
    const { checked, name, type, value } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return
    const nextErrors = {
      title: values.title.trim() ? undefined : 'Title is required',
      course: values.course.trim() ? undefined : 'Course is required',
      dueDate: values.dueDate ? undefined : 'Due date and time are required',
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    savingRef.current = true
    setIsSaving(true)
    onSavingChange?.(true)
    setSubmitError('')
    try {
      await onSubmit({
        title: values.title.trim(),
        course: values.course.trim(),
        dueDate: new Date(values.dueDate).toISOString(),
        priority: values.priority,
        isCompleted: values.isCompleted,
        notes: values.notes.trim() || null,
      })
    } catch {
      if (mountedRef.current) setSubmitError('Could not save the assignment. Try again.')
    } finally {
      savingRef.current = false
      if (mountedRef.current) {
        setIsSaving(false)
        onSavingChange?.(false)
      }
    }
  }

  return (
    <form className="assignment-form" onSubmit={handleSubmit} noValidate>
      <label>Title<input name="title" value={values.title} onChange={updateValue} aria-describedby={errors.title ? 'title-error' : undefined} /></label>
      {errors.title && <p className="field-error" id="title-error">{errors.title}</p>}
      <label>Course<input name="course" value={values.course} onChange={updateValue} aria-describedby={errors.course ? 'course-error' : undefined} /></label>
      {errors.course && <p className="field-error" id="course-error">{errors.course}</p>}
      <label>Due date and time<input name="dueDate" type="datetime-local" value={values.dueDate} onChange={updateValue} aria-describedby={errors.dueDate ? 'due-date-error' : undefined} /></label>
      {errors.dueDate && <p className="field-error" id="due-date-error">{errors.dueDate}</p>}
      <label>Priority<select name="priority" value={values.priority} onChange={updateValue}><option>Low</option><option>Medium</option><option>High</option></select></label>
      <label>Notes<textarea name="notes" value={values.notes} onChange={updateValue} /></label>
      {initialTask && <label className="checkbox-field"><input name="isCompleted" type="checkbox" checked={values.isCompleted} onChange={updateValue} />Completed</label>}
      {submitError && <p className="form-error" role="alert">{submitError}</p>}
      <div className="form-actions">
        {initialTask && onDelete && <button className="danger-button" type="button" onClick={onDelete} disabled={isSaving}>Delete assignment</button>}
        <button type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
        <button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save assignment'}</button>
      </div>
    </form>
  )
}
