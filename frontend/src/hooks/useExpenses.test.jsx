import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExpense, deleteExpense, listExpenses, updateExpense } from '../api/expenses'
import { useExpenses } from './useExpenses'

vi.mock('../api/expenses', () => ({ createExpense: vi.fn(), deleteExpense: vi.fn(), listExpenses: vi.fn(), updateExpense: vi.fn() }))

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

function deferred() { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }

describe('useExpenses', () => {
  it('loads the selected month newest first and retries independently', async () => {
    listExpenses.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([
      { id: 1, date: '2026-09-01T04:00:00Z' }, { id: 2, date: '2026-09-08T04:00:00Z' },
    ])
    const { result } = renderHook(() => useExpenses({ year: 2026, month: 9 }))
    await waitFor(() => expect(result.current.status).toBe('error'))
    await act(() => result.current.retry())
    expect(result.current.expenses.map((item) => item.id)).toEqual([2, 1])
    expect(listExpenses.mock.calls[1]).toEqual([2026, 9, { signal: expect.anything() }])
  })

  it('refreshes the list and summary after every successful mutation', async () => {
    const onMutated = vi.fn()
    listExpenses.mockResolvedValue([])
    createExpense.mockResolvedValue({ id: 1 }); updateExpense.mockResolvedValue(null); deleteExpense.mockResolvedValue(null)
    const { result } = renderHook(() => useExpenses({ year: 2026, month: 9, onMutated }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(() => result.current.create({ title: 'Food' }))
    await act(() => result.current.update(1, { title: 'Lunch' }))
    await act(() => result.current.remove(1))
    expect(listExpenses).toHaveBeenCalledTimes(4)
    expect(onMutated).toHaveBeenCalledTimes(3)
  })

  it('aborts and ignores stale loads when the month changes or the hook unmounts', async () => {
    const stale = deferred(); const current = deferred(); const pending = deferred()
    listExpenses.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise).mockReturnValueOnce(pending.promise)
    const { result, rerender, unmount } = renderHook(({ month }) => useExpenses({ year: 2026, month }), { initialProps: { month: 8 } })
    const firstSignal = listExpenses.mock.calls[0][2].signal
    rerender({ month: 9 })
    expect(firstSignal.aborted).toBe(true)
    await act(() => current.resolve([{ id: 2, date: '2026-09-02T00:00:00Z' }]))
    expect(result.current.expenses[0].id).toBe(2)
    rerender({ month: 10 })
    const secondSignal = listExpenses.mock.calls[2][2].signal
    unmount()
    expect(secondSignal.aborted).toBe(true)
    await act(() => stale.resolve([{ id: 1, date: '2026-08-01T00:00:00Z' }]))
  })

  it('aborts an owned mutation and skips refreshes after unmount', async () => {
    const onMutated = vi.fn()
    let mutationSignal
    listExpenses.mockResolvedValue([])
    createExpense.mockImplementation((_input, { signal }) => {
      mutationSignal = signal
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    })
    const { result, unmount } = renderHook(() => useExpenses({ year: 2026, month: 9, onMutated }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const mutation = result.current.create({ title: 'Lunch' })
    unmount()
    expect(mutationSignal.aborted).toBe(true)
    await expect(mutation).rejects.toMatchObject({ name: 'AbortError' })
    expect(listExpenses).toHaveBeenCalledOnce()
    expect(onMutated).not.toHaveBeenCalled()
  })
})
