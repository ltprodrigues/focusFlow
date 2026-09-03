import { request } from './http'

function expensePayload(input) {
  const { title, amount, category, date, notes } = input
  return { title, amount, category, date, notes }
}

function withSignal(options, signal) {
  return signal ? { ...options, signal } : options
}

export function listExpenses(year, month, { signal } = {}) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  return request(`/api/expenses?${params}`, { signal })
}

export function getExpense(id, { signal } = {}) {
  return request(`/api/expenses/${encodeURIComponent(id)}`, { signal })
}

export function createExpense(input, { signal } = {}) {
  return request('/api/expenses', withSignal({
    method: 'POST',
    body: JSON.stringify(expensePayload(input)),
  }, signal))
}

export function updateExpense(id, input, { signal } = {}) {
  return request(`/api/expenses/${encodeURIComponent(id)}`, withSignal({
    method: 'PUT',
    body: JSON.stringify(expensePayload(input)),
  }, signal))
}

export function deleteExpense(id, { signal } = {}) {
  return request(`/api/expenses/${encodeURIComponent(id)}`, withSignal({
    method: 'DELETE',
  }, signal))
}
