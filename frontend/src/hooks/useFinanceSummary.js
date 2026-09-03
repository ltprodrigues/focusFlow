import { useCallback, useEffect, useRef, useState } from 'react'
import { getFinanceSummary, putBudget } from '../api/finance'

export function useFinanceSummary({ year, month }) {
  const [state, setState] = useState({ summary: null, status: 'idle', error: null })
  const mountedRef = useRef(false)
  const requestRef = useRef({ id: 0, controller: null })
  const saveRef = useRef(null)

  const refresh = useCallback(async () => {
    requestRef.current.controller?.abort()
    const controller = new AbortController()
    const id = requestRef.current.id + 1
    requestRef.current = { id, controller }
    if (mountedRef.current) setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const summary = await getFinanceSummary(year, month, { signal: controller.signal })
      if (mountedRef.current && requestRef.current.id === id && !controller.signal.aborted) {
        requestRef.current = { id, controller: null }
        setState({ summary, status: 'success', error: null })
      }
      return summary
    } catch (error) {
      if (mountedRef.current && requestRef.current.id === id && !controller.signal.aborted && error.name !== 'AbortError') {
        requestRef.current = { id, controller: null }
        setState((current) => ({ ...current, status: 'error', error }))
      }
      throw error
    }
  }, [month, year])

  useEffect(() => {
    mountedRef.current = true
    refresh().catch(() => {})
    return () => {
      mountedRef.current = false
      requestRef.current.controller?.abort()
      requestRef.current = { id: requestRef.current.id + 1, controller: null }
      saveRef.current?.abort()
      saveRef.current = null
    }
  }, [refresh])

  const saveBudget = useCallback(async (amount) => {
    saveRef.current?.abort()
    const controller = new AbortController()
    saveRef.current = controller
    try {
      const saved = await putBudget(year, month, amount, { signal: controller.signal })
      if (!controller.signal.aborted && mountedRef.current) await refresh().catch(() => {})
      return saved
    } finally {
      if (saveRef.current === controller) saveRef.current = null
    }
  }, [month, refresh, year])

  return { ...state, refresh, saveBudget }
}
