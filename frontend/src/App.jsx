import { useCallback, useEffect, useMemo, useState } from 'react'
import { listTasks } from './api/tasks'
import { WeeklyPlanner } from './components/assignments/WeeklyPlanner'
import { DashboardHeader } from './components/layout/DashboardHeader'
import { Sidebar } from './components/layout/Sidebar'
import './App.css'
import { getWeekRange } from './utils/week'

function App() {
  const [weekDate, setWeekDate] = useState(() => new Date())
  const [tasks, setTasks] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const week = useMemo(() => getWeekRange(weekDate), [weekDate])

  const taskRequest = useCallback((signal) => {
    const rangeEnd = new Date(week.end)
    rangeEnd.setDate(rangeEnd.getDate() + 2)
    rangeEnd.setHours(23, 59, 59, 999)
    return listTasks({ from: week.start.toISOString(), to: rangeEnd.toISOString(), signal })
  }, [week.end, week.start])

  const settleTaskRequest = useCallback((request) => {
    request
      .then((items) => {
        setTasks(items)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError('Assignments could not load.')
          setStatus('error')
        }
      })
  }, [])

  function loadTasks() {
    setStatus('loading')
    setError('')
    settleTaskRequest(taskRequest())
  }

  useEffect(() => {
    const controller = new AbortController()
    settleTaskRequest(taskRequest(controller.signal))
    return () => controller.abort()
  }, [settleTaskRequest, taskRequest])

  function shiftWeek(amount) {
    setWeekDate((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + amount * 7)
      return next
    })
  }

  return (
    <div className="dashboard-shell" id="dashboard">
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <DashboardHeader />
          <WeeklyPlanner
            days={week.days}
            error={status === 'error' ? error : undefined}
            isLoading={status === 'loading'}
            onNextWeek={() => shiftWeek(1)}
            onPreviousWeek={() => shiftWeek(-1)}
            onRetry={loadTasks}
            tasks={tasks}
          />
        </main>
      </div>
    </div>
  )
}

export default App
