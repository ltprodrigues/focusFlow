function formatTime(value) {
  return new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function AssignmentCard({ task, onSelect }) {
  const priority = task.priority?.toLowerCase() ?? 'low'

  return (
    <button className={`assignment-card priority-${priority}`} type="button" onClick={() => onSelect?.(task)}>
      <strong>{task.title}</strong>
      <span>{task.course} · {formatTime(task.dueDate)}</span>
    </button>
  )
}
