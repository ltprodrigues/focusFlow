import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { ProfileMenu } from './ProfileMenu'

afterEach(cleanup)

const maya = { name: 'Maya Singh', email: 'maya@example.com', pictureUrl: null }

it('opens a keyboard-accessible profile menu and restores focus', async () => {
  render(<ProfileMenu user={maya} onLogout={() => Promise.resolve()} />)
  const trigger = screen.getByRole('button', { name: 'Open profile menu' })
  await userEvent.click(trigger)

  expect(screen.getByText('maya@example.com')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByText('maya@example.com')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('locks dismissal while logout is pending and reports a failure', async () => {
  let reject
  const pending = new Promise((_, rejectPromise) => { reject = rejectPromise })
  render(<ProfileMenu user={maya} onLogout={() => pending} />)
  await userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

  expect(screen.getByRole('menuitem', { name: 'Signing out…' })).toBeDisabled()
  await userEvent.keyboard('{Escape}')
  expect(screen.getByText('maya@example.com')).toBeInTheDocument()
  await act(async () => reject(new Error('offline')))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out')
})
