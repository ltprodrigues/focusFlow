import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseList } from './ExpenseList'

afterEach(cleanup)

describe('ExpenseList', () => {
  it('shows empty and independent error/retry states', async () => {
    const retry = vi.fn()
    const { rerender } = render(<ExpenseList expenses={[]} status="ready" />)
    expect(screen.getByText('No expenses this month.')).toBeInTheDocument()
    rerender(<ExpenseList expenses={[]} status="error" error="Expenses could not load." onRetry={retry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
  })

  it('selects an expense row for editing', async () => {
    const select = vi.fn()
    render(<ExpenseList status="ready" onSelect={select} expenses={[{ id: 1, title: 'Lunch', amount: 12, category: 'Food', date: '2026-09-02T04:00:00Z' }]} />)
    await userEvent.click(screen.getByRole('button', { name: /Lunch/ }))
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })
})
