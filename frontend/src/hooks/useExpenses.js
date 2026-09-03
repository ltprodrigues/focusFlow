import { useCallback, useEffect, useRef, useState } from 'react'
import { createExpense, deleteExpense, listExpenses, updateExpense } from '../api/expenses'

function newestFirst(items) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
}

export function useExpenses({ year, month, onMutated }) {
  const [state, setState] = useState({ expenses: [], status: 'loading', error: '' })
  const mountedRef = useRef(false)
  const requestRef = useRef({ id: 0, controller: null })
  const mutationControllersRef = useRef(new Set())

  const load = useCallback(async (showLoading = false) => {
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const id = requestRef.current.id + 1
    requestRef.current = { id, controller }
    if (showLoading && mountedRef.current) setState({ expenses: [], status: 'loading', error: '' })
    try {
      const items = await listExpenses(year, month, { signal: controller.signal })
      if (mountedRef.current && requestRef.current.id === id && !controller.signal.aborted) {
        requestRef.current = { id, controller: null }
        setState({ expenses: newestFirst(items), status: 'ready', error: '' })
      }
      return items
    } catch (error) {
      if (mountedRef.current && requestRef.current.id === id && !controller.signal.aborted && error.name !== 'AbortError') {
        requestRef.current = { id, controller: null }
        setState({ expenses: [], status: 'error', error: 'Expenses could not load.' })
      }
      throw error
    }
  }, [month, year])

  useEffect(() => {
    const mutationControllers = mutationControllersRef.current
    mountedRef.current = true
    load(true).catch(() => {})
    return () => {
      mountedRef.current = false
      requestRef.current.controller?.abort()
      requestRef.current = { id: requestRef.current.id + 1, controller: null }
      mutationControllers.forEach((controller) => controller.abort())
      mutationControllers.clear()
    }
  }, [load])

  const mutate = useCallback(async (operation) => {
    const controller = new AbortController()
    mutationControllersRef.current.add(controller)
    try {
      const result = await operation(controller.signal)
      if (mountedRef.current && !controller.signal.aborted) {
        await Promise.allSettled([
          load(false),
          Promise.resolve().then(() => onMutated?.()),
        ])
      }
      return result
    } finally {
      mutationControllersRef.current.delete(controller)
    }
  }, [load, onMutated])

  const create = useCallback((input) => mutate((signal) => createExpense(input, { signal })), [mutate])
  const update = useCallback((id, input) => mutate((signal) => updateExpense(id, input, { signal })), [mutate])
  const remove = useCallback((id) => mutate((signal) => deleteExpense(id, { signal })), [mutate])
  const retry = useCallback(() => load(true), [load])

  return { ...state, create, update, remove, retry }
}
