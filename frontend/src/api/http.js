export class ApiError extends Error {
  constructor(status, details) {
    super(details?.title ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function request(path, options = {}) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}${path}`,
    {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
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
    throw new ApiError(response.status, body)
  }

  return body
}
