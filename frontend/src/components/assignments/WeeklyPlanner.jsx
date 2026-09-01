import { AssignmentCard } from './AssignmentCard'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'

const weekdayFormat = new Intl.DateTimeFormat('en-CA', { weekday: 'short' })
const dateFormat = new Intl.DateTimeFormat('en-CA', { day: 'numeric' })
const rangeFormat = new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric' })
const dueFormat = new Intl.DateTimeFormat('en-CA', { weekday: 'long', hour: 'numeric', minute: '2-digit' })

function isSameDay(first, second) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate()
}

function formatRange(days) {
  return days.length === 0 ? 'This week' : `${rangeFormat.format(days[0])}–${rangeFormat.format(days[days.length - 1])}`
}

function getNextTask(tasks, now) {
  return tasks
    .filter((task) => !task.isCompleted && new Date(task.dueDate) >= now)
    .sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate))[0]
}

export function WeeklyPlanner({
  days = [], tasks = [], nextTask: suppliedNextTask, isLoading = false, error, now = new Date(), onPreviousWeek, onNextWeek, onSelectTask, onRetry, onViewAll,
}) {
  const nextTask = suppliedNextTask === undefined ? getNextTask(tasks, now) : suppliedNextTask

  return (
    <section className="planner-card" aria-labelledby="planner-heading">
      <div className="planner-title-row">
        <div>
          <h2 id="planner-heading">Your week at a glance</h2>
          <p className="planner-subtitle">{formatRange(days)} · {tasks.length} {tasks.length === 1 ? 'assignment' : 'assignments'}</p>
        </div>
        <div className="week-controls" aria-label="Week navigation">
          <button type="button" aria-label="Previous week" onClick={onPreviousWeek}>‹</button>
          <span>This week</span>
          <button type="button" aria-label="Next week" onClick={onNextWeek}>›</button>
        </div>
      </div>
      {error ? <ErrorState message={error} onRetry={onRetry} /> : (
        <div className="planner-scroll" aria-busy={isLoading}>
          <div className="week-grid">
            {days.map((day) => {
              const dayTasks = tasks.filter((task) => isSameDay(new Date(task.dueDate), day))
              const isToday = isSameDay(day, now)
              return (
                <section className={`day-column${isToday ? ' is-today' : ''}`} key={day.toISOString()}>
                  <p className="day-name">{weekdayFormat.format(day).toUpperCase()}</p>
                  <h3>{dateFormat.format(day)}</h3>
                  {isLoading ? <p className="planner-loading">Loading assignments…</p> : dayTasks.length > 0 ? dayTasks.map((task) => (
                    <AssignmentCard key={task.id} task={task} onSelect={onSelectTask} />
                  )) : <EmptyState />}
                </section>
              )
            })}
          </div>
        </div>
      )}
      <div className="next-deadline" aria-live="polite">
        {nextTask ? <span><strong>Due next:</strong> {nextTask.title} {dueFormat.format(new Date(nextTask.dueDate))}</span> : <span><strong>Due next:</strong> No upcoming assignments</span>}
        <button type="button" onClick={onViewAll}>View all assignments →</button>
      </div>
    </section>
  )
}
