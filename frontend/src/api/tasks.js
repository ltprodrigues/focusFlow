import { request } from './http'

export function listTasks({ from, to, signal } = {}) {
  const params = new URLSearchParams()

  if (from) {
    params.set('from', from)
  }

  if (to) {
    params.set('to', to)
  }

  const query = params.size > 0 ? `?${params}` : ''
  return request(`/api/tasks${query}`, { signal })
}

export function listNextTasks({ from, signal }) {
  return listTasks({ from, signal })
}

export function createTask(input) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTask(id, input) {
  return request(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteTask(id) {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}
