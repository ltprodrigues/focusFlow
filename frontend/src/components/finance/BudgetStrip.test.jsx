import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { BudgetStrip } from './BudgetStrip'

afterEach(cleanup)

const summary = {
  year: 2026,
  month: 8,
  budgetAmount: 600,
  totalSpent: 342,
  remaining: 258,
  isOverBudget: false,
  hasBudget: true,
  categories: [
    { category: 'Food', amount: 180 },
    { category: 'Transport', amount: 92 },
    { category: 'School', amount: 70 },
    { category: 'Entertainment', amount: 0 },
    { category: 'Housing', amount: 10 },
  ],
}

it('shows the monthly calculation, four category totals, and add action', () => {
  render(<BudgetStrip summary={summary} status="success" onAddExpense={vi.fn()} />)
  expect(screen.getByRole('heading', { name: 'August budget' })).toBeInTheDocument()
  expect(screen.getByText('$258.00')).toBeInTheDocument()
  expect(screen.getByText('Food')).toBeInTheDocument()
  expect(screen.getByText('Entertainment')).toBeInTheDocument()
  expect(screen.queryByText('Housing')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument()
})

it('shows an over-budget amount without clamping it', () => {
  render(<BudgetStrip summary={{ ...summary, remaining: -25, isOverBudget: true }} status="success" />)
  expect(screen.getByText('$25.00 over budget')).toBeInTheDocument()
})

it('keeps spending details and expense entry available before a budget is set', async () => {
  const user = userEvent.setup()
  const onEditBudget = vi.fn()
  render(<BudgetStrip summary={{ ...summary, hasBudget: false, budgetAmount: 0, remaining: -342, isOverBudget: true }} status="success" onAddExpense={vi.fn()} onEditBudget={onEditBudget} />)
  expect(screen.getByText('$342.00')).toBeInTheDocument()
  expect(screen.getByLabelText('Monthly budget not set; $342.00 spent')).toBeInTheDocument()
  expect(screen.getByText('Food')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Set monthly budget' }))
  expect(onEditBudget).toHaveBeenCalledOnce()
})

it('distinguishes a month with no spending', () => {
  render(<BudgetStrip summary={{ ...summary, totalSpent: 0, remaining: 600, categories: [] }} status="success" />)
  expect(screen.getByText('No spending yet this month.')).toBeInTheDocument()
})

it('renders loading and retry states', async () => {
  const user = userEvent.setup()
  const onRetry = vi.fn()
  const { rerender } = render(<BudgetStrip status="loading" />)
  expect(screen.getByText('Loading monthly budget…')).toBeInTheDocument()
  rerender(<BudgetStrip status="error" error={new Error('offline')} onRetry={onRetry} />)
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
