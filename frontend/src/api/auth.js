import { API_BASE_URL, request } from './http'

export function getCurrentUser() {
  return request('/api/auth/me')
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' })
}

export function buildGoogleLoginUrl(returnUrl = '/') {
  const localReturnUrl = isLocalPath(returnUrl) ? returnUrl : '/'
  const params = new URLSearchParams({
    returnUrl: localReturnUrl,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto',
  })
  return `${API_BASE_URL}/api/auth/google/login?${params}`
}

function isLocalPath(value) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
}
