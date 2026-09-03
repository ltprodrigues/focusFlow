import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { LoginScreen } from './LoginScreen'

afterEach(cleanup)

it('offers Google as the only sign-in method', async () => {
  const onLogin = vi.fn()
  render(<LoginScreen onLogin={onLogin} />)

  await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))

  expect(onLogin).toHaveBeenCalledOnce()
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
})

it('shows a retry action when session bootstrap fails', async () => {
  const onRetry = vi.fn()
  render(<LoginScreen error onLogin={() => {}} onRetry={onRetry} />)

  expect(screen.getByRole('alert')).toHaveTextContent('Could not check your session')
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
