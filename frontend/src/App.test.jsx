import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getFinanceSummary, putBudget } from './api/finance'
import { createExpense, deleteExpense, listExpenses, updateExpense } from './api/expenses'
import { createTask, deleteTask, listNextTasks, listTasks, updateTask } from './api/tasks'
import { getWeekRange } from './utils/week'

vi.mock('./api/tasks', () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi.fn(),
  listNextTasks: vi.fn(),
  updateTask: vi.fn(),
}))

vi.mock('./api/finance', () => ({
  getFinanceSummary: vi.fn(),
  putBudget: vi.fn(),
}))

vi.mock('./api/expenses', () => ({
  createExpense: vi.fn(), deleteExpense: vi.fn(), listExpenses: vi.fn(), updateExpense: vi.fn(),
}))

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function currentWeekTask(title, offset = 0) {
  const dueDate = new Date(getWeekRange(new Date()).days[0])
  dueDate.setDate(dueDate.getDate() + offset)
  dueDate.setHours(12, 0, 0, 0)
  return {
    id: title,
    title,
    course: 'English',
    dueDate: dueDate.toISOString(),
    priority: 'High',
    isCompleted: false,
  }
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

beforeEach(() => {
  listNextTasks.mockResolvedValue([])
  getFinanceSummary.mockResolvedValue({
    year: 2026,
    month: 8,
    budgetAmount: 0,
    totalSpent: 0,
    remaining: 0,
    isOverBudget: false,
    hasBudget: false,
    categories: [],
  })
  putBudget.mockResolvedValue({ amount: 600 })
  listExpenses.mockResolvedValue([])
  createExpense.mockResolvedValue({ id: 1 })
  updateExpense.mockResolvedValue(null)
  deleteExpense.mockResolvedValue(null)
})

describe('App', () => {
  it('adds an expense from the strip, closes, and refreshes expenses and summary', async () => {
    const user = userEvent.setup()
    listTasks.mockResolvedValue([])
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Add expense' }))
    const dialog = screen.getByRole('dialog', { name: 'New expense' })
    await user.type(within(dialog).getByLabelText('Title'), 'Lunch')
    await user.type(within(dialog).getByLabelText('Amount'), '14.50')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Food')
    await user.click(within(dialog).getByRole('button', { name: 'Save expense' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New expense' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add expense' })).toHaveFocus())
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lunch', amount: 14.5, category: 'Food' }), { signal: expect.anything() })
    expect(listExpenses).toHaveBeenCalledTimes(2)
    expect(getFinanceSummary).toHaveBeenCalledTimes(2)
  })

  it('closes after a successful expense write when only the summary refresh fails', async () => {
    const user = userEvent.setup()
    listTasks.mockResolvedValue([])
    getFinanceSummary
      .mockResolvedValueOnce({
        year: 2026, month: 9, budgetAmount: 600, totalSpent: 0,
        remaining: 600, isOverBudget: false, hasBudget: true, categories: [],
      })
      .mockRejectedValueOnce(new Error('Summary refresh unavailable'))
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Add expense' }))
    const dialog = screen.getByRole('dialog', { name: 'New expense' })
    await user.type(within(dialog).getByLabelText('Title'), 'Lunch')
    await user.type(within(dialog).getByLabelText('Amount'), '14.50')
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'Food')
    await user.click(within(dialog).getByRole('button', { name: 'Save expense' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New expense' })).not.toBeInTheDocument())
    expect(createExpense).toHaveBeenCalledOnce()
    expect(await screen.findByText('Summary refresh unavailable')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Expense created.')
    expect(screen.queryByText('Could not save the expense. Try again.')).not.toBeInTheDocument()
  })

  it('keeps expense values and ownership while a save fails or resolves late', async () => {
    const user = userEvent.setup()
    const pending = deferred()
    listTasks.mockResolvedValue([])
    createExpense.mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error('offline'))
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Add expense' }))
    await user.type(screen.getByLabelText('Title'), 'Bus pass')
    await user.type(screen.getByLabelText('Amount'), '28')
    await user.selectOptions(screen.getByLabelText('Category'), 'Transport')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(screen.getByRole('button', { name: 'Close new expense' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'New expense' })).toBeInTheDocument()
    await act(async () => pending.reject(new Error('offline')))
    expect(await screen.findByText('Could not save the expense. Try again.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bus pass')).toBeInTheDocument()
  })

  it('opens a listed expense prefilled and updates it', async () => {
    const user = userEvent.setup()
    const expense = { id: 4, title: 'Rent', amount: 800, category: 'Housing', date: '2026-09-01T04:00:00Z', notes: 'September' }
    listTasks.mockResolvedValue([])
    listExpenses.mockResolvedValueOnce([expense]).mockResolvedValueOnce([expense])
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Edit Rent/ }))
    expect(screen.getByRole('dialog', { name: 'Edit expense' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Rent')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    await waitFor(() => expect(updateExpense).toHaveBeenCalledWith(4, expect.objectContaining({ category: 'Housing' }), { signal: expect.anything() }))
  })

  it('cancels and reports failed expense deletion before a successful retry', async () => {
    const user = userEvent.setup()
    const expense = { id: 5, title: 'Book', amount: 42, category: 'School', date: '2026-09-02T04:00:00Z', notes: '' }
    listTasks.mockResolvedValue([])
    listExpenses.mockResolvedValueOnce([expense]).mockResolvedValueOnce([])
    deleteExpense.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null)
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Edit Book/ }))
    await user.click(screen.getByRole('button', { name: 'Delete expense' }))
    let confirmation = screen.getByRole('dialog', { name: 'Delete expense?' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    expect(deleteExpense).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete expense' })).toHaveFocus())
    await user.click(screen.getByRole('button', { name: 'Delete expense' }))
    confirmation = screen.getByRole('dialog', { name: 'Delete expense?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete expense' }))
    expect(await within(confirmation).findByText('Could not delete the expense. Try again.')).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete expense' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete expense?' })).not.toBeInTheDocument())
    expect(deleteExpense).toHaveBeenCalledTimes(2)
    expect(getFinanceSummary).toHaveBeenCalledTimes(2)
  })
  it('loads the next deadline independently of the viewed week and refreshes it after a mutation', async () => {
    const user = userEvent.setup()
    const viewed = currentWeekTask('Viewed task')
    const next = { ...currentWeekTask('Future deadline', 14), id: 'future' }
    listTasks.mockResolvedValueOnce([viewed]).mockResolvedValueOnce([])
    listNextTasks.mockResolvedValueOnce([next]).mockResolvedValueOnce([])
    updateTask.mockResolvedValue(null)

    render(<App />)

    expect(await screen.findByText((_, element) => element?.classList.contains('next-deadline') && element.textContent.includes('Future deadline'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Viewed task/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Completed' }))
    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    await waitFor(() => expect(listTasks).toHaveBeenCalledTimes(2))
    expect(screen.getByText((_, element) => element?.classList.contains('next-deadline') && element.textContent.includes('No upcoming assignments'))).toBeInTheDocument()
    expect(listNextTasks.mock.calls[0][0]).toEqual(expect.objectContaining({ from: expect.any(String), signal: expect.anything() }))
    expect(listNextTasks.mock.calls[0][0]).not.toHaveProperty('to')
  })

  it('does not let a retry that resolves after week navigation overwrite the active range', async () => {
    const initial = deferred()
    const retry = deferred()
    const nextWeek = deferred()
    const user = userEvent.setup()
    listTasks
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(retry.promise)
      .mockReturnValueOnce(nextWeek.promise)

    render(<App />)
    await act(async () => initial.reject(new Error('Network error')))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getAllByText('Loading assignments…')).toHaveLength(5)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await act(async () => nextWeek.resolve([currentWeekTask('Next week task', 7)]))
    expect(await screen.findByRole('button', { name: /Next week task/ })).toBeInTheDocument()

    await act(async () => retry.resolve([currentWeekTask('Stale retry task')]))
    expect(screen.getByRole('button', { name: /Next week task/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Stale retry task/ })).not.toBeInTheDocument()
  })

  it('shows loading and hides stale assignments as soon as the selected week changes', async () => {
    const initial = deferred()
    const nextWeek = deferred()
    const user = userEvent.setup()
    listTasks.mockReturnValueOnce(initial.promise).mockReturnValueOnce(nextWeek.promise)

    render(<App />)
    await act(async () => initial.resolve([currentWeekTask('Current week task')]))
    expect(await screen.findByRole('button', { name: /Current week task/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next week' }))

    expect(screen.getAllByText('Loading assignments…')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /Current week task/ })).not.toBeInTheDocument()
  })

  it('creates an assignment from the header and refreshes the active section', async () => {
    const user = userEvent.setup()
    listTasks.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    createTask.mockResolvedValue({ id: 8 })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Add assignment/ }))
    expect(screen.getByRole('dialog', { name: 'New assignment' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Title'), 'Research essay')
    await user.type(screen.getByLabelText('Course'), 'English')
    await user.type(screen.getByLabelText('Due date and time'), '2026-09-02T14:30')
    await user.selectOptions(screen.getByLabelText('Priority'), 'High')
    await user.type(screen.getByLabelText('Notes'), 'Read chapters 4 and 5')
    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    const localOffset = new Date(2026, 8, 2, 14, 30).getTimezoneOffset()
    const exactDueDate = new Date(Date.UTC(2026, 8, 2, 14, 30) + localOffset * 60_000).toISOString()
    await waitFor(() => expect(createTask).toHaveBeenCalledWith({
      title: 'Research essay',
      course: 'English',
      dueDate: exactDueDate,
      priority: 'High',
      isCompleted: false,
      notes: 'Read chapters 4 and 5',
    }))
    expect(listTasks).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog', { name: 'New assignment' })).not.toBeInTheDocument()
  })

  it('opens a selected card in edit mode and persists completion', async () => {
    const user = userEvent.setup()
    const task = currentWeekTask('Research essay')
    listTasks.mockResolvedValueOnce([task]).mockResolvedValueOnce([{ ...task, isCompleted: true }])
    updateTask.mockResolvedValue(null)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Research essay/ }))
    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Completed' }))
    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({
      title: 'Research essay',
      isCompleted: true,
    })))
    expect(screen.queryByRole('dialog', { name: 'Edit assignment' })).not.toBeInTheDocument()
  })

  it('requires confirmation before deleting an assignment', async () => {
    const user = userEvent.setup()
    const task = currentWeekTask('Research essay')
    listTasks.mockResolvedValueOnce([task]).mockResolvedValueOnce([])
    deleteTask.mockResolvedValue(null)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Research essay/ }))
    await user.click(screen.getByRole('button', { name: 'Delete assignment' }))
    expect(deleteTask).not.toHaveBeenCalled()

    const confirmation = screen.getByRole('dialog', { name: 'Delete assignment?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete assignment' }))

    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith(task.id))
    expect(screen.queryByRole('dialog', { name: 'Delete assignment?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Edit assignment' })).not.toBeInTheDocument()
  })

  it('cancels editing without mutating the assignment', async () => {
    const user = userEvent.setup()
    const task = currentWeekTask('Research essay')
    listTasks.mockResolvedValue([task])
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Research essay/ }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Changed locally')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(updateTask).not.toHaveBeenCalled()
    expect(deleteTask).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Edit assignment' })).not.toBeInTheDocument()
  })

  it('keeps the create dialog open when the API rejects the mutation', async () => {
    const user = userEvent.setup()
    listTasks.mockResolvedValue([])
    createTask.mockRejectedValue(new Error('offline'))
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Add assignment/ }))
    await user.type(screen.getByLabelText('Title'), 'Research essay')
    await user.type(screen.getByLabelText('Course'), 'English')
    await user.type(screen.getByLabelText('Due date and time'), '2026-09-02T14:30')
    await user.click(screen.getByRole('button', { name: 'Save assignment' }))

    expect(await screen.findByText('Could not save the assignment. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'New assignment' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Research essay')).toBeInTheDocument()
  })

  it('does not let assignment A finishing late close assignment B', async () => {
    const user = userEvent.setup()
    const firstTask = currentWeekTask('Assignment A')
    const secondTask = currentWeekTask('Assignment B', 1)
    const mutation = deferred()
    listTasks.mockResolvedValueOnce([firstTask, secondTask]).mockResolvedValueOnce([firstTask, secondTask])
    updateTask.mockReturnValue(mutation.promise)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Assignment A/ }))
    await user.click(screen.getByRole('button', { name: 'Save assignment' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: /Assignment B/ }))

    await act(async () => mutation.resolve(null))
    await waitFor(() => expect(listTasks).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Assignment B')
  })

  it('retains rejected delete confirmation and supports retry', async () => {
    const user = userEvent.setup()
    const task = currentWeekTask('Research essay')
    listTasks.mockResolvedValueOnce([task]).mockResolvedValueOnce([])
    deleteTask.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Research essay/ }))
    await user.click(screen.getByRole('button', { name: 'Delete assignment' }))
    let confirmation = screen.getByRole('dialog', { name: 'Delete assignment?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete assignment' }))

    expect(await within(confirmation).findByText('Could not delete the assignment. Try again.')).toBeInTheDocument()
    confirmation = screen.getByRole('dialog', { name: 'Delete assignment?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete assignment' }))

    await waitFor(() => expect(deleteTask).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog', { name: 'Delete assignment?' })).not.toBeInTheDocument()
  })

  it('exposes only confirmation and traps Escape and Tab in its active layer while deletion is pending', async () => {
    const user = userEvent.setup()
    const task = currentWeekTask('Research essay')
    const mutation = deferred()
    listTasks.mockResolvedValue([task])
    deleteTask.mockReturnValue(mutation.promise)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Research essay/ }))
    await user.click(screen.getByRole('button', { name: 'Delete assignment' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const hiddenEditor = screen.getByRole('dialog', { name: 'Edit assignment', hidden: true })
    expect(hiddenEditor.closest('.dialog-backdrop')).toHaveAttribute('aria-hidden', 'true')
    expect(hiddenEditor.closest('.dialog-backdrop')).toHaveAttribute('inert')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Delete assignment?' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete assignment' }))
    const confirmation = screen.getByRole('dialog', { name: 'Delete assignment?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete assignment' }))
    expect(within(confirmation).getByRole('button', { name: 'Deleting…' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Delete assignment?' })).toBeInTheDocument()
    await user.tab()
    expect(confirmation).toContainElement(document.activeElement)

    const backgroundOpener = screen.getByRole('button', { name: /Add assignment/ })
    backgroundOpener.focus()
    await user.tab()
    expect(confirmation).toContainElement(document.activeElement)

    await act(async () => mutation.reject(new Error('offline')))
  })

  it('restores focus to Add assignment when deletion removes the selected card', async () => {
    const user = userEvent.setup()
    const task = currentWeekTask('Research essay')
    listTasks.mockResolvedValueOnce([task]).mockResolvedValueOnce([])
    deleteTask.mockResolvedValue(null)
    render(<App />)
    const fallback = screen.getByRole('button', { name: /Add assignment/ })

    await user.click(await screen.findByRole('button', { name: /Research essay/ }))
    await user.click(screen.getByRole('button', { name: 'Delete assignment' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete assignment?' })).getByRole('button', { name: 'Delete assignment' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fallback).toHaveFocus()
  })

  it('ignores and aborts a late all-assignment response after close', async () => {
    const user = userEvent.setup()
    const late = deferred()
    const current = currentWeekTask('Current all record')
    listTasks.mockResolvedValueOnce([]).mockReturnValueOnce(late.promise).mockResolvedValueOnce([current])
    render(<App />)

    await user.click(screen.getByRole('button', { name: /View all assignments/ }))
    const requestOptions = listTasks.mock.calls[1][0]
    expect(requestOptions).toEqual(expect.objectContaining({ signal: expect.anything() }))
    expect(requestOptions).not.toHaveProperty('from')
    expect(requestOptions).not.toHaveProperty('to')
    await user.click(screen.getByRole('button', { name: 'Close all assignments' }))
    expect(requestOptions.signal.aborted).toBe(true)
    await act(async () => late.resolve([currentWeekTask('Late all record')]))
    expect(screen.queryByRole('dialog', { name: 'All assignments' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Late all record/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /View all assignments/ }))
    expect(await screen.findByRole('button', { name: /Current all record/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Late all record/ })).not.toBeInTheDocument()
  })

  it('aborts and ignores a late all-assignment response after unmount', async () => {
    const user = userEvent.setup()
    const late = deferred()
    listTasks.mockResolvedValueOnce([]).mockReturnValueOnce(late.promise)
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: /View all assignments/ }))
    const requestOptions = listTasks.mock.calls[1][0]
    expect(requestOptions).toEqual(expect.objectContaining({ signal: expect.anything() }))
    unmount()
    expect(requestOptions.signal.aborted).toBe(true)
    await act(async () => late.resolve([currentWeekTask('Late all record')]))
  })

  it('keeps ownership of the budget dialog while its save is pending', async () => {
    const user = userEvent.setup()
    const save = deferred()
    listTasks.mockResolvedValue([])
    getFinanceSummary.mockResolvedValue({
      year: 2026, month: 9, budgetAmount: 0, totalSpent: 42, remaining: -42,
      isOverBudget: true, hasBudget: false, categories: [{ category: 'Food', amount: 42 }],
    })
    putBudget.mockReturnValue(save.promise)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Set monthly budget' }))
    const budgetDialog = screen.getByRole('dialog', { name: 'Monthly budget' })
    await user.type(within(budgetDialog).getByLabelText('Monthly budget'), '600')
    await user.click(within(budgetDialog).getByRole('button', { name: 'Save budget' }))
    expect(within(budgetDialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(within(budgetDialog).getByRole('button', { name: 'Close monthly budget' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Monthly budget' })).toBeInTheDocument()
    await user.click(budgetDialog.closest('.dialog-backdrop'))
    expect(screen.getByRole('dialog', { name: 'Monthly budget' })).toBeInTheDocument()

    await act(async () => save.resolve({ amount: 600 }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Monthly budget' })).not.toBeInTheDocument())
  })

  it('reinitializes an unsaved budget value when the dialog is reopened', async () => {
    const user = userEvent.setup()
    listTasks.mockResolvedValue([])
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Set monthly budget' }))
    let budgetDialog = screen.getByRole('dialog', { name: 'Monthly budget' })
    await user.type(within(budgetDialog).getByLabelText('Monthly budget'), '321')
    await user.click(within(budgetDialog).getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Set monthly budget' }))
    budgetDialog = screen.getByRole('dialog', { name: 'Monthly budget' })
    expect(within(budgetDialog).getByLabelText('Monthly budget')).toHaveValue(null)
  })

  it.each([
    ['weekday', currentWeekTask('Weekday essay')],
    ['weekend', currentWeekTask('Weekend reading', 6)],
  ])('loads all assignments without a range and opens a %s record in edit mode', async (_, selectedTask) => {
    const user = userEvent.setup()
    const weekday = currentWeekTask('Weekday essay')
    const weekend = currentWeekTask('Weekend reading', 6)
    listTasks.mockResolvedValueOnce([]).mockResolvedValueOnce([weekend, weekday])
    render(<App />)

    await user.click(screen.getByRole('button', { name: /View all assignments/ }))
    const requestOptions = listTasks.mock.calls[1][0]
    expect(requestOptions).toEqual(expect.objectContaining({ signal: expect.anything() }))
    expect(requestOptions).not.toHaveProperty('from')
    expect(requestOptions).not.toHaveProperty('to')
    const allDialog = await screen.findByRole('dialog', { name: 'All assignments' })
    await user.click(within(allDialog).getByRole('button', { name: new RegExp(selectedTask.title) }))

    expect(screen.queryByRole('dialog', { name: 'All assignments' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue(selectedTask.title)
  })
})
