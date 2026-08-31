import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { listTasks } from './api/tasks'
import { getWeekRange } from './utils/week'

vi.mock('./api/tasks', () => ({ listTasks: vi.fn() }))

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
})
