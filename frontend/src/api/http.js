export class ApiError extends Error {
  constructor(status, details) {
    super(details?.title ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

let antiforgeryToken = null
let unauthorizedHandler = null

export function setAntiforgeryToken(token) {
  antiforgeryToken = token || null
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler ?? null
}

export async function request(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  if (isUnsafe && !antiforgeryToken) {
    throw new Error('A current antiforgery token is required for this request.')
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(isUnsafe ? { 'X-FocusFlow-CSRF': antiforgeryToken } : {}),
        ...options.headers,
      },
    },
  )
  let body = null
  if (response.status !== 204) {
    const contentType = response.headers?.get?.('content-type') ?? ''
    if (contentType.includes('json') || !response.text) {
      body = await response.json()
    } else {
      const message = await response.text()
      body = { title: message || `Request failed with status ${response.status}` }
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.()
    }
    throw new ApiError(response.status, body)
  }

  return body
}
