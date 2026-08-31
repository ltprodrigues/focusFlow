import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './http'
import { createTask, deleteTask, listTasks, updateTask } from './tasks'

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('listTasks', () => {
  it('encodes both ISO range values', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetch)

    await listTasks({
      from: '2026-08-24T00:00:00.000Z',
      to: '2026-08-28T23:59:59.999Z',
    })

    const url = new URL(fetch.mock.calls[0][0])
    expect(url.searchParams.get('from')).toBe('2026-08-24T00:00:00.000Z')
    expect(url.searchParams.get('to')).toBe('2026-08-28T23:59:59.999Z')
  })

  it('omits range parameters when viewing all tasks', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetch)

    await listTasks()

    expect(fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/tasks')
  })
})

describe('createTask', () => {
  it('sends the input as JSON', async () => {
    const task = { title: 'Outline essay', course: 'History' }
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ id: 5, ...task }, 201))
    vi.stubGlobal('fetch', fetch)

    await createTask(task)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/tasks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(task),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })
})

describe('updateTask', () => {
  it('sends the input as a JSON PUT request', async () => {
    const task = { title: 'Revise outline', course: 'History' }
    const fetch = vi.fn().mockResolvedValue(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetch)

    await updateTask(5, task)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/tasks/5',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(task) }),
    )
  })
})

describe('deleteTask', () => {
  it('sends a DELETE request for the task', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetch)

    await deleteTask(5)

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/tasks/5',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('request', () => {
  it('keeps the JSON content type when callers add a custom header', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetch)

    await request('/api/tasks', { headers: { 'X-Request-Id': 'request-123' } })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/tasks',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': 'request-123',
        },
      }),
    )
  })

  it('preserves validation messages in ApiError details', async () => {
    const problem = {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: { Title: ['The Title field is required.'] },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(problem, 400)))

    const result = request('/api/tasks')
    await expect(result).rejects.toBeInstanceOf(ApiError)
    await expect(result).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      details: problem,
    })
  })

  it('returns null for no-content responses without parsing a body', async () => {
    const response = { ok: true, status: 204, json: vi.fn() }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(request('/api/tasks/5', { method: 'DELETE' })).resolves.toBeNull()
    expect(response.json).not.toHaveBeenCalled()
  })
})
