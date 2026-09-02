import { formatCad } from '../../utils/currency'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'

const dateFormatter = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' })

export function ExpenseList({ expenses = [], status, error, onRetry, onSelect }) {
  if (status === 'loading' || status === 'idle') return <section className="expense-list" aria-busy="true">Loading expenses...</section>
  if (status === 'error') return <section className="expense-list"><ErrorState message={error || 'Expenses could not load.'} onRetry={onRetry} /></section>
  return (
    <section className="expense-list" aria-labelledby="expense-list-title">
      <h2 id="expense-list-title">This month's expenses</h2>
      {expenses.length === 0 ? <EmptyState>No expenses this month.</EmptyState> : (
        <ul>{expenses.map((expense) => <li key={expense.id}><button type="button" onClick={() => onSelect(expense)} aria-label={`Edit ${expense.title}, ${formatCad(expense.amount)}`}><span><strong>{expense.title}</strong><small>{expense.category} - {dateFormatter.format(new Date(expense.date))}</small></span><b>{formatCad(expense.amount)}</b></button></li>)}</ul>
      )}
    </section>
  )
}
