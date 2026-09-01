import { useEffect, useMemo, useRef, useState } from 'react'
import { listTasks } from './api/tasks'
import { AllAssignmentsDialog } from './components/assignments/AllAssignmentsDialog'
import { AssignmentForm } from './components/assignments/AssignmentForm'
import { WeeklyPlanner } from './components/assignments/WeeklyPlanner'
import { DashboardHeader } from './components/layout/DashboardHeader'
import { Sidebar } from './components/layout/Sidebar'
import { ConfirmDialog } from './components/shared/ConfirmDialog'
import { Dialog } from './components/shared/Dialog'
import { useAssignments } from './hooks/useAssignments'
import { useNextDeadline } from './hooks/useNextDeadline'
import './App.css'
import './styles/dialog.css'
import { getWeekRange } from './utils/week'

function App() {
  const [weekDate, setWeekDate] = useState(() => new Date())
  const [editor, setEditor] = useState({ open: false, task: null, owner: 0 })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [allAssignments, setAllAssignments] = useState({ open: false, tasks: [], status: 'idle' })
  const addAssignmentRef = useRef(null)
  const editorOwnerRef = useRef(0)
  const mountedRef = useRef(false)
  const allRequestRef = useRef({ controller: null, id: 0 })
  const week = useMemo(() => getWeekRange(weekDate), [weekDate])
  const nextDeadline = useNextDeadline()
  const assignments = useAssignments({ start: week.start, end: week.end, onMutated: nextDeadline.refresh })
  const [announcement, setAnnouncement] = useState('')

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
    setConfirmOpen(false)
    setEditor({ open: true, task, owner })
  }

  function closeEditor(expectedOwner) {
    if (typeof expectedOwner === 'number' && editorOwnerRef.current !== expectedOwner) return
    editorOwnerRef.current += 1
    setConfirmOpen(false)
    setEditor({ open: false, task: null, owner: editorOwnerRef.current })
  }

  async function saveAssignment(payload) {
    const owner = editor.owner
    if (editor.task) {
      await assignments.update(editor.task.id, payload)
      setAnnouncement('Assignment updated.')
    } else {
      await assignments.create(payload)
      setAnnouncement('Assignment created.')
    }
    closeEditor(owner)
  }

  async function deleteAssignment() {
    const owner = editor.owner
    await assignments.remove(editor.task.id)
    setAnnouncement('Assignment deleted.')
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
          <p className="sr-only" role="status">{announcement}</p>
        </main>
      </div>

      <Dialog
        active={!confirmOpen}
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
        />
      </Dialog>

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
    </div>
  )
}

export default App
