import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from '../api/http'
import { AuthProvider, useAuth } from './AuthContext'
import { getCurrentUser, logout as logoutRequest } from '../api/auth'

vi.mock('../api/auth', () => ({
  buildGoogleLoginUrl: vi.fn(() => 'http://localhost:5000/api/auth/google/login'),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}))

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('boots into authenticated state and keeps the CSRF token out of the user profile', async () => {
    getCurrentUser.mockResolvedValue({
      id: 7, name: 'Maya Singh', email: 'maya@example.com', antiforgeryToken: 'csrf-7',
    })

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('authenticated:Maya Singh')).toBeInTheDocument()
    expect(screen.getByTestId('csrf')).toHaveTextContent('csrf-7')
  })

  it('boots into anonymous state after a 401', async () => {
    getCurrentUser.mockRejectedValue(new ApiError(401))

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })

  it('shows a retryable error for a bootstrap failure', async () => {
    getCurrentUser.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 7, name: 'Maya', antiforgeryToken: 'csrf' })

    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('error')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'retry' }))
    expect(await screen.findByText('authenticated:Maya')).toBeInTheDocument()
  })

  it('clears the profile after logout succeeds but preserves it after failure', async () => {
    getCurrentUser.mockResolvedValue({ id: 7, name: 'Maya', antiforgeryToken: 'csrf' })
    logoutRequest.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null)
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('authenticated:Maya')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    expect(await screen.findByText('authenticated:Maya')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument())
  })

  it('returns to anonymous state when a later API request receives 401', async () => {
    getCurrentUser.mockResolvedValue({ id: 7, name: 'Maya', antiforgeryToken: 'csrf' })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(await screen.findByText('authenticated:Maya')).toBeInTheDocument()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: vi.fn().mockResolvedValue({ title: 'Unauthorized' }),
    }))

    await request('/api/tasks').catch(() => {})

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })
})

function Probe() {
  const auth = useAuth()
  return <>
    <span>{auth.status}{auth.user ? `:${auth.user.name}` : ''}</span>
    <span data-testid="csrf">{auth.csrfToken}</span>
    <button onClick={auth.retry}>retry</button>
    <button onClick={() => auth.logout().catch(() => {})}>logout</button>
  </>
}
