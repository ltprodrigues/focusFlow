import { Dialog } from '../shared/Dialog'

const dueFormat = new Intl.DateTimeFormat('en-CA', {
  weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})

export function AllAssignmentsDialog({ open, tasks = [], status, onSelect, onClose }) {
  const sortedTasks = [...tasks].sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate))

  return (
    <Dialog open={open} title="All assignments" onClose={onClose} className="all-assignments-dialog">
      {status === 'loading' ? <p className="dialog-status">Loading assignments…</p> : status === 'error' ? (
        <p className="form-error" role="alert">All assignments could not load.</p>
      ) : sortedTasks.length === 0 ? <p className="dialog-status">No assignments</p> : (
        <ul className="all-assignments-list" aria-label="All assignments">
          {sortedTasks.map((task) => (
            <li key={task.id}>
              <button type="button" onClick={() => onSelect(task)}>
                <span><strong>{task.title}</strong><small>{task.course}</small></span>
                <span>{dueFormat.format(new Date(task.dueDate))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
