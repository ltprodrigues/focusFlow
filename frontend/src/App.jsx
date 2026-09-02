import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { listTasks } from './api/tasks'
import { AllAssignmentsDialog } from './components/assignments/AllAssignmentsDialog'
import { AssignmentForm } from './components/assignments/AssignmentForm'
import { WeeklyPlanner } from './components/assignments/WeeklyPlanner'
import { BudgetForm } from './components/finance/BudgetForm'
import { BudgetStrip } from './components/finance/BudgetStrip'
import { ExpenseForm } from './components/finance/ExpenseForm'
import { ExpenseList } from './components/finance/ExpenseList'
import { DashboardHeader } from './components/layout/DashboardHeader'
import { Sidebar } from './components/layout/Sidebar'
import { ConfirmDialog } from './components/shared/ConfirmDialog'
import { Dialog } from './components/shared/Dialog'
import { useAssignments } from './hooks/useAssignments'
import { useNextDeadline } from './hooks/useNextDeadline'
import { useFinanceSummary } from './hooks/useFinanceSummary'
import { useExpenses } from './hooks/useExpenses'
import './App.css'
import './styles/dialog.css'
import './styles/budget.css'
import { getWeekRange } from './utils/week'

export class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <main className="dashboard-fatal-error" role="alert"><h1>FocusFlow could not display this page.</h1><p>Refresh the page to try again.</p></main>
    }
    return this.props.children
  }
}

function FocusFlowDashboard() {
  const [weekDate, setWeekDate] = useState(() => new Date())
  const [editor, setEditor] = useState({ open: false, task: null, owner: 0, saving: false })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [allAssignments, setAllAssignments] = useState({ open: false, tasks: [], status: 'idle' })
  const addAssignmentRef = useRef(null)
  const editorOwnerRef = useRef(0)
  const editorSavingRef = useRef(false)
  const mountedRef = useRef(false)
  const allRequestRef = useRef({ controller: null, id: 0 })
  const week = useMemo(() => getWeekRange(weekDate), [weekDate])
  const nextDeadline = useNextDeadline()
  const assignments = useAssignments({ start: week.start, end: week.end, onMutated: nextDeadline.refresh })
  const [announcement, setAnnouncement] = useState({ id: 0, message: '' })
  const today = useMemo(() => new Date(), [])
  const finances = useFinanceSummary({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const [budgetEditor, setBudgetEditor] = useState({ open: false, owner: 0 })
  const budgetOwnerRef = useRef(0)
  const budgetSavingRef = useRef(false)
  const addExpenseRef = useRef(null)
  const expenseOwnerRef = useRef(0)
  const expenseSavingRef = useRef(false)
  const [expenseEditor, setExpenseEditor] = useState({ open: false, expense: null, owner: 0, saving: false })
  const [expenseConfirmOpen, setExpenseConfirmOpen] = useState(false)
  const expenses = useExpenses({ year: today.getFullYear(), month: today.getMonth() + 1, onMutated: finances.refresh })

  function announce(message) {
    setAnnouncement((current) => ({ id: current.id + 1, message }))
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const request = allRequestRef.current
      request.controller?.abort()
      allRequestRef.current = { controller: null, id: request.id + 1 }
    }
  }, [])

  function shiftWeek(amount) {
    setWeekDate((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + amount * 7)
      return next
    })
  }

  function openEditor(task) {
    const owner = editorOwnerRef.current + 1
    editorOwnerRef.current = owner
    editorSavingRef.current = false
    setConfirmOpen(false)
    setEditor({ open: true, task, owner, saving: false })
  }

  function closeEditor(expectedOwner, force = false) {
    if (typeof expectedOwner === 'number' && editorOwnerRef.current !== expectedOwner) return
    if (editorSavingRef.current && !force) return
    editorOwnerRef.current += 1
    editorSavingRef.current = false
    setConfirmOpen(false)
    setEditor({ open: false, task: null, owner: editorOwnerRef.current, saving: false })
  }

  function setEditorSaving(owner, saving) {
    if (editorOwnerRef.current !== owner) return
    editorSavingRef.current = saving
    setEditor((current) => current.owner === owner ? { ...current, saving } : current)
  }

  async function saveAssignment(payload) {
    const owner = editor.owner
    const wasEditing = Boolean(editor.task)
    if (editor.task) {
      await assignments.update(editor.task.id, payload)
    } else {
      await assignments.create(payload)
    }
    if (mountedRef.current && editorOwnerRef.current === owner) {
      announce(wasEditing ? 'Assignment updated.' : 'Assignment created.')
      closeEditor(owner, true)
    }
  }

  async function deleteAssignment() {
    const owner = editor.owner
    await assignments.remove(editor.task.id)
    announce('Assignment deleted.')
    closeEditor(owner)
  }

  function invalidateAllRequest() {
    const request = allRequestRef.current
    request.controller?.abort()
    allRequestRef.current = { controller: null, id: request.id + 1 }
  }

  function closeAllAssignments() {
    invalidateAllRequest()
    setAllAssignments((current) => ({ ...current, open: false }))
  }

  function openAllAssignments() {
    invalidateAllRequest()
    const controller = new AbortController()
    const requestId = allRequestRef.current.id + 1
    allRequestRef.current = { controller, id: requestId }
    setAllAssignments({ open: true, tasks: [], status: 'loading' })
    listTasks({ signal: controller.signal })
      .then((tasks) => {
        if (mountedRef.current && allRequestRef.current.id === requestId && !controller.signal.aborted) {
          allRequestRef.current = { controller: null, id: requestId }
          setAllAssignments({ open: true, tasks, status: 'ready' })
        }
      })
      .catch((requestError) => {
        if (mountedRef.current && allRequestRef.current.id === requestId && requestError.name !== 'AbortError' && !controller.signal.aborted) {
          allRequestRef.current = { controller: null, id: requestId }
          setAllAssignments({ open: true, tasks: [], status: 'error' })
        }
      })
  }

  function editFromAll(task) {
    closeAllAssignments()
    openEditor(task)
  }

  function openBudgetEditor() {
    const owner = budgetOwnerRef.current + 1
    budgetOwnerRef.current = owner
    budgetSavingRef.current = false
    setBudgetEditor({ open: true, owner, saving: false })
  }

  function closeBudgetEditor(expectedOwner, force = false) {
    if (typeof expectedOwner === 'number' && budgetOwnerRef.current !== expectedOwner) return
    if (budgetSavingRef.current && !force) return
    budgetOwnerRef.current += 1
    budgetSavingRef.current = false
    setBudgetEditor({ open: false, owner: budgetOwnerRef.current })
  }

  function setBudgetSaving(owner, saving) {
    if (budgetOwnerRef.current !== owner) return
    budgetSavingRef.current = saving
    setBudgetEditor((current) => current.owner === owner ? { ...current, saving } : current)
  }

  function openExpenseEditor(expense = null) {
    const owner = expenseOwnerRef.current + 1
    expenseOwnerRef.current = owner
    expenseSavingRef.current = false
    setExpenseConfirmOpen(false)
    setExpenseEditor({ open: true, expense, owner, saving: false })
  }

  function closeExpenseEditor(expectedOwner, force = false) {
    if (typeof expectedOwner === 'number' && expenseOwnerRef.current !== expectedOwner) return
    if (expenseSavingRef.current && !force) return
    expenseOwnerRef.current += 1
    expenseSavingRef.current = false
    setExpenseConfirmOpen(false)
    setExpenseEditor({ open: false, expense: null, owner: expenseOwnerRef.current, saving: false })
  }

  function setExpenseSaving(owner, saving) {
    if (expenseOwnerRef.current !== owner) return
    expenseSavingRef.current = saving
    setExpenseEditor((current) => current.owner === owner ? { ...current, saving } : current)
  }

  async function saveExpense(payload) {
    if (expenseEditor.expense) return expenses.update(expenseEditor.expense.id, payload)
    return expenses.create(payload)
  }

  async function deleteSelectedExpense() {
    const owner = expenseEditor.owner
    await expenses.remove(expenseEditor.expense.id)
    if (expenseOwnerRef.current === owner) {
      announce('Expense deleted.')
      closeExpenseEditor(owner, true)
    }
  }

  return (
    <div className="dashboard-shell" id="dashboard">
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <DashboardHeader addButtonRef={addAssignmentRef} onAddAssignment={() => openEditor(null)} />
          <WeeklyPlanner
            days={week.days}
            error={assignments.status === 'error' ? assignments.error : undefined}
            isLoading={assignments.status === 'loading'}
            onNextWeek={() => shiftWeek(1)}
            onPreviousWeek={() => shiftWeek(-1)}
            onRetry={assignments.retry}
            onSelectTask={openEditor}
            onViewAll={openAllAssignments}
            tasks={assignments.tasks}
            nextTask={nextDeadline.task}
          />
          <BudgetStrip
            summary={finances.summary}
            status={finances.status}
            error={finances.error}
            onRetry={finances.refresh}
            onAddExpense={() => openExpenseEditor()}
            onEditBudget={openBudgetEditor}
            addExpenseRef={addExpenseRef}
          />
          <ExpenseList expenses={expenses.expenses} status={expenses.status} error={expenses.error} onRetry={expenses.retry} onSelect={openExpenseEditor} />
          <p className="sr-only" key={announcement.id} role="status">{announcement.message}</p>
        </main>
      </div>

      <Dialog
        active={!confirmOpen}
        dismissible={!editor.saving}
        fallbackFocusRef={addAssignmentRef}
        open={editor.open}
        title={editor.task ? 'Edit assignment' : 'New assignment'}
        onClose={() => closeEditor()}
      >
        <AssignmentForm
          initialTask={editor.task}
          onCancel={() => closeEditor()}
          onDelete={editor.task ? () => setConfirmOpen(true) : undefined}
          onSubmit={saveAssignment}
          onSavingChange={(saving) => setEditorSaving(editor.owner, saving)}
        />
      </Dialog>

      <Dialog
        active={!expenseConfirmOpen}
        dismissible={!expenseEditor.saving}
        fallbackFocusRef={addExpenseRef}
        open={expenseEditor.open}
        title={expenseEditor.expense ? 'Edit expense' : 'New expense'}
        onClose={() => closeExpenseEditor()}
      >
        <ExpenseForm
          key={expenseEditor.owner}
          initialExpense={expenseEditor.expense}
          onCancel={() => closeExpenseEditor()}
          onSubmit={saveExpense}
          onSavingChange={(saving) => setExpenseSaving(expenseEditor.owner, saving)}
          onSaved={() => {
            const owner = expenseEditor.owner
            announce(expenseEditor.expense ? 'Expense updated.' : 'Expense created.')
            closeExpenseEditor(owner, true)
          }}
        />
        {expenseEditor.expense && <button className="expense-delete-button danger-button" type="button" onClick={() => setExpenseConfirmOpen(true)} disabled={expenseEditor.saving}>Delete expense</button>}
      </Dialog>

      <ConfirmDialog
        key={`expense-${expenseEditor.owner}`}
        open={expenseConfirmOpen}
        title="Delete expense?"
        message="This expense will be permanently deleted."
        confirmLabel="Delete expense"
        errorMessage="Could not delete the expense. Try again."
        fallbackFocusRef={addExpenseRef}
        onCancel={() => setExpenseConfirmOpen(false)}
        onConfirm={deleteSelectedExpense}
      />

      <ConfirmDialog
        key={editor.owner}
        open={confirmOpen}
        title="Delete assignment?"
        message="This assignment will be permanently deleted."
        confirmLabel="Delete assignment"
        fallbackFocusRef={addAssignmentRef}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={deleteAssignment}
      />

      <AllAssignmentsDialog
        open={allAssignments.open}
        tasks={allAssignments.tasks}
        status={allAssignments.status}
        onClose={closeAllAssignments}
        onSelect={editFromAll}
      />

      <Dialog
        dismissible={!budgetEditor.saving}
        open={budgetEditor.open}
        title="Monthly budget"
        onClose={() => closeBudgetEditor()}
      >
        <BudgetForm
          key={budgetEditor.owner}
          initialAmount={finances.summary?.hasBudget ? finances.summary.budgetAmount : undefined}
          onCancel={() => closeBudgetEditor()}
          onSubmit={finances.saveBudget}
          onSavingChange={(saving) => setBudgetSaving(budgetEditor.owner, saving)}
          onSaved={() => { announce('Monthly budget saved.'); closeBudgetEditor(budgetEditor.owner, true) }}
        />
      </Dialog>
    </div>
  )
}

function App() {
  return <DashboardErrorBoundary><FocusFlowDashboard /></DashboardErrorBoundary>
}

export default App
