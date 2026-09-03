import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildGoogleLoginUrl, getCurrentUser, logout } from './auth'
import { setAntiforgeryToken } from './http'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setAntiforgeryToken(null)
})

describe('Google auth client', () => {
  it('builds a login URL with browser timezone and a local return path', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone: 'America/Toronto' })

    const url = new URL(buildGoogleLoginUrl('/assignments'))

    expect(url.pathname).toBe('/api/auth/google/login')
    expect(url.searchParams.get('returnUrl')).toBe('/assignments')
    expect(url.searchParams.get('timeZone')).toBe('America/Toronto')
  })

  it('falls back to the dashboard for an external return URL', () => {
    const url = new URL(buildGoogleLoginUrl('https://evil.example'))
    expect(url.searchParams.get('returnUrl')).toBe('/')
  })

  it('gets the current profile with credentials', async () => {
    const profile = { id: 7, name: 'Maya', antiforgeryToken: 'csrf-7' }
    const fetch = vi.fn().mockResolvedValue(jsonResponse(profile))
    vi.stubGlobal('fetch', fetch)

    await expect(getCurrentUser()).resolves.toEqual(profile)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ credentials: 'include' }))
  })

  it('sends the in-memory antiforgery token on logout', async () => {
    setAntiforgeryToken('csrf-7')
    const fetch = vi.fn().mockResolvedValue(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetch)

    await logout()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-FocusFlow-CSRF': 'csrf-7' }),
      }))
  })
})

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: vi.fn().mockResolvedValue(body),
  }
}
