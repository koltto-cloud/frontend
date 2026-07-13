import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/components/PaginationControls'

export function useClientPagination<T>(items: readonly T[], defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize) as T[]
  }, [items, safePage, pageSize])

  const setPageSize = (size: number) => {
    setPageSizeState(Math.min(Math.max(size, 1), MAX_PAGE_SIZE))
    setPage(1)
  }

  return {
    page: safePage,
    pageSize,
    pageItems,
    totalItems,
    setPage,
    setPageSize,
  }
}
