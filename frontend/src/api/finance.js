import { request } from './http'

function withSignal(options, signal) {
  return signal ? { ...options, signal } : options
}

export function getFinanceSummary(year, month, { signal } = {}) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  return request(`/api/finance/summary?${params}`, { signal })
}

export function getBudget(year, month, { signal } = {}) {
  return request(`/api/budgets/${encodeURIComponent(year)}/${encodeURIComponent(month)}`, {
    signal,
  })
}

export function putBudget(year, month, amount, { signal } = {}) {
  return request(
    `/api/budgets/${encodeURIComponent(year)}/${encodeURIComponent(month)}`,
    withSignal({
      method: 'PUT',
      body: JSON.stringify({ amount }),
    }, signal),
  )
}
