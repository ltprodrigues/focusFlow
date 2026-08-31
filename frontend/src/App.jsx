import { useMemo, useRef, useState } from 'react'
import { listTasks } from './api/tasks'
import { AllAssignmentsDialog } from './components/assignments/AllAssignmentsDialog'
import { AssignmentForm } from './components/assignments/AssignmentForm'
import { WeeklyPlanner } from './components/assignments/WeeklyPlanner'
import { DashboardHeader } from './components/layout/DashboardHeader'
import { Sidebar } from './components/layout/Sidebar'
import { ConfirmDialog } from './components/shared/ConfirmDialog'
import { Dialog } from './components/shared/Dialog'
import { useAssignments } from './hooks/useAssignments'
import './App.css'
import './styles/dialog.css'
import { getWeekRange } from './utils/week'

function App() {
  const [weekDate, setWeekDate] = useState(() => new Date())
  const [editor, setEditor] = useState({ open: false, task: null })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [allAssignments, setAllAssignments] = useState({ open: false, tasks: [], status: 'idle' })
  const allRequestRef = useRef(0)
  const week = useMemo(() => getWeekRange(weekDate), [weekDate])
  const assignments = useAssignments({ start: week.start, end: week.end })

  function shiftWeek(amount) {
    setWeekDate((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + amount * 7)
      return next
    })
  }

  function closeEditor() {
    setConfirmOpen(false)
    setEditor({ open: false, task: null })
  }

  async function saveAssignment(payload) {
    if (editor.task) {
      await assignments.update(editor.task.id, payload)
    } else {
      await assignments.create(payload)
    }
    closeEditor()
  }

  async function deleteAssignment() {
    await assignments.remove(editor.task.id)
    closeEditor()
  }

  function closeAllAssignments() {
    allRequestRef.current += 1
    setAllAssignments((current) => ({ ...current, open: false }))
  }

  function openAllAssignments() {
    const requestId = allRequestRef.current + 1
    allRequestRef.current = requestId
    setAllAssignments({ open: true, tasks: [], status: 'loading' })
    listTasks()
      .then((tasks) => {
        if (allRequestRef.current === requestId) {
          setAllAssignments({ open: true, tasks, status: 'ready' })
        }
      })
      .catch(() => {
        if (allRequestRef.current === requestId) {
          setAllAssignments({ open: true, tasks: [], status: 'error' })
        }
      })
  }

  function editFromAll(task) {
    closeAllAssignments()
    setEditor({ open: true, task })
  }

  return (
    <div className="dashboard-shell" id="dashboard">
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <DashboardHeader onAddAssignment={() => setEditor({ open: true, task: null })} />
          <WeeklyPlanner
            days={week.days}
            error={assignments.status === 'error' ? assignments.error : undefined}
            isLoading={assignments.status === 'loading'}
            onNextWeek={() => shiftWeek(1)}
            onPreviousWeek={() => shiftWeek(-1)}
            onRetry={assignments.retry}
            onSelectTask={(task) => setEditor({ open: true, task })}
            onViewAll={openAllAssignments}
            tasks={assignments.tasks}
          />
        </main>
      </div>

      <Dialog open={editor.open} title={editor.task ? 'Edit assignment' : 'New assignment'} onClose={closeEditor}>
        <AssignmentForm
          initialTask={editor.task}
          onCancel={closeEditor}
          onDelete={editor.task ? () => setConfirmOpen(true) : undefined}
          onSubmit={saveAssignment}
        />
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete assignment?"
        message="This assignment will be permanently deleted."
        confirmLabel="Delete assignment"
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
    </div>
  )
}

export default App
