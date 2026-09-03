import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseForm } from './ExpenseForm'

afterEach(cleanup)

async function fillExpense() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Title'), 'Bus pass')
  await user.type(screen.getByLabelText('Amount'), '28')
  await user.selectOptions(screen.getByLabelText('Category'), 'Transport')
  await user.clear(screen.getByLabelText('Date'))
  await user.type(screen.getByLabelText('Date'), '2026-09-01')
  await user.type(screen.getByLabelText('Notes'), 'September pass')
  return user
}

describe('ExpenseForm', () => {
  it('requires a title, positive amount, category, and date', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('Amount'), '0')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    expect(screen.getByText('Category is required')).toBeInTheDocument()
  })

  it('submits an allowlisted payload with a numeric amount and safe ISO date', async () => {
    const submit = vi.fn().mockResolvedValue(null)
    render(<ExpenseForm initialExpense={{ UserId: 99 }} onSubmit={submit} onCancel={vi.fn()} />)
    const user = await fillExpense()
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      title: 'Bus pass', amount: 28, category: 'Transport',
      date: new Date(2026, 8, 1).toISOString(), notes: 'September pass',
    }))
    expect(submit.mock.calls[0][0]).not.toHaveProperty('UserId')
  })

  it('preserves all values after an API error', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('offline'))
    render(<ExpenseForm onSubmit={submit} onCancel={vi.fn()} />)
    const user = await fillExpense()
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(await screen.findByDisplayValue('Bus pass')).toBeInTheDocument()
    expect(screen.getByDisplayValue('28')).toBeInTheDocument()
    expect(screen.getByText('Could not save the expense. Try again.')).toBeInTheDocument()
  })

  it('prefills an existing expense and disables dismissal controls while saving', async () => {
    const pending = new Promise(() => {})
    const saving = vi.fn()
    const user = userEvent.setup()
    render(<ExpenseForm initialExpense={{ title: 'Lunch', amount: 12.5, category: 'Food', date: '2026-08-31T04:00:00.000Z', notes: 'Cafe' }} onSubmit={() => pending} onCancel={vi.fn()} onSavingChange={saving} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Lunch')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-08-31')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(saving).toHaveBeenCalledWith(true)
  })

  it('owns an in-flight save and does not notify after unmount', async () => {
    let resolve
    const pending = new Promise((done) => { resolve = done })
    const saving = vi.fn()
    const submit = vi.fn(() => pending)
    const user = userEvent.setup()
    const { unmount } = render(<ExpenseForm onSubmit={submit} onCancel={vi.fn()} onSavingChange={saving} />)
    await user.type(screen.getByLabelText('Title'), 'Coffee')
    await user.type(screen.getByLabelText('Amount'), '4.25')
    await user.selectOptions(screen.getByLabelText('Category'), 'Food')
    await user.dblClick(screen.getByRole('button', { name: 'Save expense' }))
    expect(submit).toHaveBeenCalledOnce()
    unmount()
    resolve()
    await pending
    expect(saving).toHaveBeenCalledTimes(1)
    expect(saving).toHaveBeenCalledWith(true)
  })
})
