import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Broken() { throw new Error('render failed') }

it('shows recovery UI and reloads the application', async () => {
  const reload = vi.fn()
  render(<ErrorBoundary onReload={reload}><Broken /></ErrorBoundary>)
  expect(screen.getByRole('alert')).toHaveTextContent('FocusFlow hit an unexpected problem.')
  await userEvent.click(screen.getByRole('button', { name: 'Reload FocusFlow' }))
  expect(reload).toHaveBeenCalledOnce()
})
