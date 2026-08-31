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
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    },
  )
  const body = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }

  return body
}
