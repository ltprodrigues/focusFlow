import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createTask, deleteTask, listTasks, updateTask } from '../api/tasks'

function requestRange(range) {
  const rangeEnd = new Date(range.end)
  rangeEnd.setDate(rangeEnd.getDate() + 2)
  return {
    from: new Date(range.start).toISOString(),
    to: rangeEnd.toISOString(),
  }
}

export function useAssignments({ start, end }) {
  const startIso = new Date(start).toISOString()
  const endIso = new Date(end).toISOString()
  const rangeKey = `${startIso}|${endIso}`
  const range = useMemo(() => ({ start: new Date(startIso), end: new Date(endIso) }), [endIso, startIso])
  const [result, setResult] = useState({ rangeKey: null, tasks: [], status: 'loading', error: '' })
  const activeRangeRef = useRef({ range, rangeKey })
  const requestRef = useRef({ controller: null, id: 0 })

  const abortRequest = useCallback(() => {
    requestRef.current.controller?.abort()
    requestRef.current = { controller: null, id: requestRef.current.id + 1 }
  }, [])

  const load = useCallback(async (nextRange, nextRangeKey) => {
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const id = requestRef.current.id + 1
    requestRef.current = { controller, id }

    try {
      const items = await listTasks({ ...requestRange(nextRange), signal: controller.signal })
      if (requestRef.current.id === id) {
        setResult({ rangeKey: nextRangeKey, tasks: items, status: 'ready', error: '' })
      }
    } catch (requestError) {
      if (requestRef.current.id === id && requestError.name !== 'AbortError') {
        setResult({ rangeKey: nextRangeKey, tasks: [], status: 'error', error: 'Assignments could not load.' })
      }
    }
  }, [])

  useEffect(() => {
    activeRangeRef.current = { range, rangeKey }
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const id = requestRef.current.id + 1
    requestRef.current = { controller, id }
    listTasks({ ...requestRange(range), signal: controller.signal })
      .then((items) => {
        if (requestRef.current.id === id) {
          setResult({ rangeKey, tasks: items, status: 'ready', error: '' })
        }
      })
      .catch((requestError) => {
        if (requestRef.current.id === id && requestError.name !== 'AbortError') {
          setResult({ rangeKey, tasks: [], status: 'error', error: 'Assignments could not load.' })
        }
      })
    return abortRequest
  }, [abortRequest, range, rangeKey])

  const refresh = useCallback(() => {
    const active = activeRangeRef.current
    return load(active.range, active.rangeKey)
  }, [load])

  const create = useCallback(async (input) => {
    await createTask(input)
    await refresh()
  }, [refresh])

  const update = useCallback(async (id, input) => {
    await updateTask(id, input)
    await refresh()
  }, [refresh])

  const remove = useCallback(async (id) => {
    await deleteTask(id)
    await refresh()
  }, [refresh])

  const retry = useCallback(() => {
    const active = activeRangeRef.current
    setResult({ rangeKey: active.rangeKey, tasks: [], status: 'loading', error: '' })
    return load(active.range, active.rangeKey)
  }, [load])

  const activeResult = result.rangeKey === rangeKey
    ? result
    : { tasks: [], status: 'loading', error: '' }

  return { ...activeResult, create, update, remove, retry }
}
