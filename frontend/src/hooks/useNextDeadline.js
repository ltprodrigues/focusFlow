import { useCallback, useEffect, useRef, useState } from 'react'
import { listNextTasks } from '../api/tasks'

export function useNextDeadline() {
  const [task, setTask] = useState(null)
  const mountedRef = useRef(false)
  const requestRef = useRef({ controller: null, id: 0 })

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const id = requestRef.current.id + 1
    requestRef.current = { controller, id }
    try {
      const tasks = await listNextTasks({ from: new Date().toISOString(), signal: controller.signal })
      if (mountedRef.current && requestRef.current.id === id) {
        setTask(tasks.find((item) => !item.isCompleted) ?? null)
      }
    } catch (error) {
      if (error.name !== 'AbortError' && mountedRef.current && requestRef.current.id === id) setTask(null)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const start = window.setTimeout(refresh, 0)
    return () => {
      window.clearTimeout(start)
      mountedRef.current = false
      requestRef.current.controller?.abort()
      requestRef.current.id += 1
    }
  }, [refresh])

  return { task, refresh }
}
