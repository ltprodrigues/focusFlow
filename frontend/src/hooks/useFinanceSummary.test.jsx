import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { getFinanceSummary, putBudget } from '../api/finance'
import { useFinanceSummary } from './useFinanceSummary'

vi.mock('../api/finance', () => ({ getFinanceSummary: vi.fn(), putBudget: vi.fn() }))

function deferred() {
  let resolve
  const promise = new Promise((yes) => { resolve = yes })
  return { promise, resolve }
}

afterEach(() => vi.resetAllMocks())

it('aborts the previous month and ignores its stale response', async () => {
  const august = deferred()
  const september = deferred()
  getFinanceSummary.mockReturnValueOnce(august.promise).mockReturnValueOnce(september.promise)
  const { result, rerender } = renderHook(({ month }) => useFinanceSummary({ year: 2026, month }), { initialProps: { month: 8 } })
  const augustSignal = getFinanceSummary.mock.calls[0][2].signal
  rerender({ month: 9 })
  expect(augustSignal.aborted).toBe(true)
  await act(async () => september.resolve({ month: 9 }))
  expect(result.current.summary).toEqual({ month: 9 })
  await act(async () => august.resolve({ month: 8 }))
  expect(result.current.summary).toEqual({ month: 9 })
})

it('aborts its request and avoids post-unmount updates', () => {
  getFinanceSummary.mockReturnValue(new Promise(() => {}))
  const { unmount } = renderHook(() => useFinanceSummary({ year: 2026, month: 8 }))
  const signal = getFinanceSummary.mock.calls[0][2].signal
  unmount()
  expect(signal.aborted).toBe(true)
})

it('saves a budget then refreshes only the finance summary', async () => {
  getFinanceSummary.mockResolvedValue({ month: 8, budgetAmount: 600 })
  putBudget.mockResolvedValue({ amount: 700 })
  const { result } = renderHook(() => useFinanceSummary({ year: 2026, month: 8 }))
  await waitFor(() => expect(result.current.status).toBe('success'))
  await act(async () => result.current.saveBudget(700))
  expect(putBudget).toHaveBeenCalledWith(2026, 8, 700, expect.objectContaining({ signal: expect.anything() }))
  expect(getFinanceSummary).toHaveBeenCalledTimes(2)
})
