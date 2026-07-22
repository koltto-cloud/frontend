import { useCallback, useEffect, useRef, useState } from 'react'
import { formatApiError } from '@/api/client'

export type UseAsyncDataOptions = {
  /** When true, keep showing the last successful data while deps change / reload. */
  keepPreviousData?: boolean
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseAsyncDataOptions = {},
) {
  const keepPreviousData = options.keepPreviousData === true
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const hasDataRef = useRef(false)
  // Monotonic id so only the most recently started fetch may write state.
  // Guards against out-of-order responses (rapid deps changes) and unmount.
  const callIdRef = useRef(0)

  const reload = useCallback(async () => {
    const callId = ++callIdRef.current
    if (!hasDataRef.current) setLoading(true)
    setError('')
    try {
      const result = await fetcher()
      if (callId !== callIdRef.current) return
      setData(result)
      hasDataRef.current = true
    } catch (err) {
      if (callId !== callIdRef.current) return
      setError(formatApiError(err))
      if (!hasDataRef.current) setData(null)
    } finally {
      if (callId === callIdRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!keepPreviousData) {
      hasDataRef.current = false
      setData(null)
    }
    setLoading(true)
    void reload()
    // Invalidate any in-flight fetch when deps change or the component unmounts,
    // so a late response never overwrites newer data.
    return () => {
      callIdRef.current++
    }
  }, [reload, keepPreviousData])

  return { data, error, loading, reload, setData }
}
