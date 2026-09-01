import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { BudgetForm } from './BudgetForm'

afterEach(cleanup)

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

it('rejects a non-positive budget', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<BudgetForm onCancel={vi.fn()} onSubmit={onSubmit} />)
  await user.type(screen.getByLabelText('Monthly budget'), '0')
  await user.click(screen.getByRole('button', { name: 'Save budget' }))
  expect(screen.getByText('Budget must be greater than zero')).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

it('keeps the value and dialog ownership when a save rejects', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn().mockRejectedValue(new Error('offline'))
  render(<BudgetForm initialAmount={600} onCancel={vi.fn()} onSubmit={onSubmit} />)
  await user.clear(screen.getByLabelText('Monthly budget'))
  await user.type(screen.getByLabelText('Monthly budget'), '725.50')
  await user.click(screen.getByRole('button', { name: 'Save budget' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the budget. Try again.')
  expect(screen.getByLabelText('Monthly budget')).toHaveValue(725.5)
})

it('waits for save completion before requesting close', async () => {
  const user = userEvent.setup()
  const save = deferred()
  const onSaved = vi.fn()
  render(<BudgetForm initialAmount={600} onCancel={vi.fn()} onSaved={onSaved} onSubmit={() => save.promise} />)
  await user.click(screen.getByRole('button', { name: 'Save budget' }))
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(onSaved).not.toHaveBeenCalled()
  await act(async () => save.resolve())
  expect(onSaved).toHaveBeenCalledOnce()
})
