import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { getBudget, getFinanceSummary, putBudget } from './finance'

vi.mock('./http', () => ({ request: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('finance API', () => {
  it('gets the encoded finance summary and forwards an AbortSignal', async () => {
    const controller = new AbortController()
    await getFinanceSummary(2026, 8, { signal: controller.signal })
    expect(request).toHaveBeenCalledWith('/api/finance/summary?year=2026&month=8', {
      signal: controller.signal,
    })
  })

  it('gets the budget and forwards an AbortSignal', async () => {
    const controller = new AbortController()
    await getBudget(2026, 8, { signal: controller.signal })
    expect(request).toHaveBeenCalledWith('/api/budgets/2026/8', { signal: controller.signal })
  })

  it('puts a decimal budget amount without ownership fields', async () => {
    await putBudget(2026, 8, 600.25)
    expect(request).toHaveBeenCalledWith('/api/budgets/2026/8', {
      method: 'PUT', body: JSON.stringify({ amount: 600.25 }),
    })
  })
})
