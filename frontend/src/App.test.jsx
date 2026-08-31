import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createTask, deleteTask, listTasks, updateTask } from './api/tasks'
import { getWeekRange } from './utils/week'

vi.mock('./api/tasks', () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi.fn(),
  updateTask: vi.fn(),
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

describe('App', () => {
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

    await waitFor(() => expect(createTask).toHaveBeenCalledWith({
      title: 'Research essay',
      course: 'English',
      dueDate: expect.stringMatching(/^2026-09-02T\d\d:30:00\.000Z$/),
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
    expect(listTasks).toHaveBeenNthCalledWith(2)
    const allDialog = await screen.findByRole('dialog', { name: 'All assignments' })
    await user.click(within(allDialog).getByRole('button', { name: new RegExp(selectedTask.title) }))

    expect(screen.queryByRole('dialog', { name: 'All assignments' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Edit assignment' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue(selectedTask.title)
  })
})
