import { ErrorState } from '../shared/ErrorState'
import { buildConicGradient } from '../../utils/chart'
import { formatCad } from '../../utils/currency'

const monthNames = new Intl.DateTimeFormat('en-CA', { month: 'long' })

export function BudgetStrip({ summary, status, error, onRetry, onAddExpense, onEditBudget, addExpenseRef }) {
  if (status === 'loading' || status === 'idle') {
    return <section className="budget-strip budget-strip-loading" aria-busy="true"><span className="budget-skeleton" />Loading monthly budget…</section>
  }
  if (status === 'error') {
    return <section className="budget-strip"><ErrorState message={error?.message || 'Could not load the monthly budget.'} onRetry={onRetry} /></section>
  }
  if (!summary) return null

  const month = monthNames.format(new Date(summary.year, summary.month - 1, 1))
  const used = summary.budgetAmount > 0 ? Math.round((summary.totalSpent / summary.budgetAmount) * 100) : 0
  const remaining = summary.isOverBudget
    ? `${formatCad(Math.abs(summary.remaining))} over budget`
    : formatCad(summary.remaining)
  const categories = (summary.categories || []).slice(0, 4)

  return (
    <section className={`budget-strip${summary.isOverBudget && summary.hasBudget ? ' is-over-budget' : ''}${summary.hasBudget ? '' : ' budget-no-budget'}`} aria-labelledby="budget-title">
      <div className="budget-chart-group">
        <div className="budget-donut" aria-label={`${used}% of budget used`} style={{ '--budget-chart': buildConicGradient(summary.categories, summary.totalSpent) }}>
          <span>{used}%</span>
        </div>
        <div><p className="budget-eyebrow">Monthly spending</p><h2 id="budget-title">{month} budget</h2><button className="budget-edit" type="button" onClick={onEditBudget}>{summary.hasBudget ? 'Edit budget' : 'Set monthly budget'}</button></div>
      </div>
      <dl className="budget-totals">
        <div><dt>Budget</dt><dd>{summary.hasBudget ? formatCad(summary.budgetAmount) : 'Not set'}</dd></div>
        <div><dt>Spent</dt><dd>{formatCad(summary.totalSpent)}</dd></div>
        {summary.hasBudget && <div className="budget-remaining"><dt>{summary.isOverBudget ? 'Over' : 'Remaining'}</dt><dd>{remaining}</dd></div>}
      </dl>
      <div className="budget-categories">
        {summary.totalSpent === 0
          ? <p>No spending yet this month.</p>
          : categories.map((item, index) => <div className={index >= 2 ? 'budget-category-secondary' : undefined} key={item.category}><span>{item.category}</span><strong>{formatCad(item.amount)}</strong></div>)}
      </div>
      <button className="budget-add-expense" ref={addExpenseRef} type="button" onClick={onAddExpense}>Add expense</button>
    </section>
  )
}
