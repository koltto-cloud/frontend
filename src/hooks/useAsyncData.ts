import { useCallback, useEffect, useRef, useState } from 'react'
import { formatApiError } from '@/api/client'

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const hasDataRef = useRef(false)

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true)
    setError('')
    try {
      const result = await fetcher()
      setData(result)
      hasDataRef.current = true
    } catch (err) {
      setError(formatApiError(err))
      if (!hasDataRef.current) setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    hasDataRef.current = false
    setData(null)
    setLoading(true)
    void reload()
  }, [reload])

  return { data, error, loading, reload, setData }
}
