import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTask, deleteTask, listTasks, updateTask } from '../api/tasks'
import { useAssignments } from './useAssignments'

vi.mock('../api/tasks', () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  listTasks: vi.fn(),
  updateTask: vi.fn(),
}))

const firstRange = {
  start: new Date('2026-08-24T04:00:00.000Z'),
  end: new Date('2026-08-29T03:59:59.999Z'),
}
const secondRange = {
  start: new Date('2026-08-31T04:00:00.000Z'),
  end: new Date('2026-09-05T03:59:59.999Z'),
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('useAssignments', () => {
  it('clears stale tasks and ignores the previous range response', async () => {
    const initial = deferred()
    const retry = deferred()
    const second = deferred()
    listTasks
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(retry.promise)
      .mockReturnValueOnce(second.promise)
    const { result, rerender } = renderHook(({ range }) => useAssignments(range), {
      initialProps: { range: firstRange },
    })

    await act(async () => initial.resolve([{ id: 1, title: 'Old week' }]))
    expect(result.current.tasks).toEqual([{ id: 1, title: 'Old week' }])

    act(() => {
      void result.current.retry()
    })
    rerender({ range: secondRange })
    expect(result.current.tasks).toEqual([])
    expect(result.current.status).toBe('loading')

    await act(async () => retry.resolve([{ id: 2, title: 'Late old week' }]))
    expect(result.current.tasks).toEqual([])
    await act(async () => second.resolve([{ id: 3, title: 'New week' }]))
    expect(result.current.tasks).toEqual([{ id: 3, title: 'New week' }])
  })

  it.each([
    ['create', createTask, { title: 'New assignment' }],
    ['update', updateTask, 7, { title: 'Updated assignment' }],
    ['remove', deleteTask, 7],
  ])('refetches the active section after %s succeeds', async (method, apiCall, ...args) => {
    listTasks.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 7, title: 'Refreshed' }])
    apiCall.mockResolvedValue(null)
    const { result } = renderHook(() => useAssignments(firstRange))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => result.current[method](...args))

    expect(apiCall).toHaveBeenCalledWith(...args)
    expect(listTasks).toHaveBeenCalledTimes(2)
    expect(listTasks.mock.calls[1][0]).toEqual(expect.objectContaining({
      from: firstRange.start.toISOString(),
      to: '2026-08-31T03:59:59.999Z',
    }))
    expect(result.current.tasks).toEqual([{ id: 7, title: 'Refreshed' }])
  })

  it('rejects a failed mutation without refreshing the section', async () => {
    listTasks.mockResolvedValue([])
    createTask.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useAssignments(firstRange))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let mutation
    act(() => {
      mutation = result.current.create({ title: 'Research essay' })
    })

    await expect(mutation).rejects.toThrow('offline')
    expect(listTasks).toHaveBeenCalledOnce()
  })
})
