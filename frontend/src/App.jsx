import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const requestRef = useRef({ controller: null, id: 0 })

  const taskRequest = useCallback((range, signal) => {
    const rangeEnd = new Date(range.end)
    rangeEnd.setDate(rangeEnd.getDate() + 2)
    rangeEnd.setHours(23, 59, 59, 999)
    return listTasks({ from: range.start.toISOString(), to: rangeEnd.toISOString(), signal })
  }, [])

  const abortTaskRequest = useCallback(() => {
    requestRef.current.controller?.abort()
    requestRef.current = { controller: null, id: requestRef.current.id + 1 }
  }, [])

  const startTaskRequest = useCallback((range) => {
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const id = requestRef.current.id + 1
    requestRef.current = { controller, id }

    taskRequest(range, controller.signal)
      .then((items) => {
        if (requestRef.current.id !== id) {
          return
        }
        setTasks(items)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (requestRef.current.id === id && requestError.name !== 'AbortError') {
          setError('Assignments could not load.')
          setStatus('error')
        }
      })
  }, [taskRequest])

  function loadTasks() {
    abortTaskRequest()
    setTasks([])
    setStatus('loading')
    setError('')
    startTaskRequest(week)
  }

  useEffect(() => {
    startTaskRequest(week)
    return abortTaskRequest
  }, [abortTaskRequest, startTaskRequest, week])

  function shiftWeek(amount) {
    abortTaskRequest()
    setTasks([])
    setStatus('loading')
    setError('')
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
