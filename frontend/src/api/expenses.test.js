import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { createExpense, deleteExpense, getExpense, listExpenses, updateExpense } from './expenses'

vi.mock('./http', () => ({ request: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

const expenseInput = {
  title: 'Bus pass', amount: 28.45, category: 'Transport',
  date: '2026-08-04T00:00:00.000Z', notes: 'Monthly pass', userId: 99,
  id: 41, unexpected: 'not part of the contract',
}

describe('expense API', () => {
  it('lists the encoded month and forwards an AbortSignal', async () => {
    const controller = new AbortController()
    await listExpenses(2026, 8, { signal: controller.signal })
    expect(request).toHaveBeenCalledWith('/api/expenses?year=2026&month=8', {
      signal: controller.signal,
    })
  })

  it('gets one expense and forwards an AbortSignal', async () => {
    const controller = new AbortController()
    await getExpense('id/with spaces', { signal: controller.signal })
    expect(request).toHaveBeenCalledWith('/api/expenses/id%2Fwith%20spaces', {
      signal: controller.signal,
    })
  })

  it('creates with only the backend allowlisted fields', async () => {
    await createExpense(expenseInput)
    expect(request).toHaveBeenCalledWith('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Bus pass', amount: 28.45, category: 'Transport',
        date: '2026-08-04T00:00:00.000Z', notes: 'Monthly pass',
      }),
    })
  })

  it('updates the encoded expense route with only allowlisted fields', async () => {
    const controller = new AbortController()
    await updateExpense('41/2', expenseInput, { signal: controller.signal })
    expect(request).toHaveBeenCalledWith('/api/expenses/41%2F2', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Bus pass', amount: 28.45, category: 'Transport',
        date: '2026-08-04T00:00:00.000Z', notes: 'Monthly pass',
      }),
      signal: controller.signal,
    })
  })

  it('deletes the encoded expense route', async () => {
    await deleteExpense(41)
    expect(request).toHaveBeenCalledWith('/api/expenses/41', { method: 'DELETE' })
  })
})
