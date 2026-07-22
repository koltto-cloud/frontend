export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

interface PaginationControlsProps {
  page: number
  pageSize: number
  /** Number of items currently shown on this page. */
  itemCount: number
  /** Total items across all pages. Enables “of N” and “Page X of Y”. */
  totalItems?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}

export default function PaginationControls({
  page,
  pageSize,
  itemCount,
  totalItems,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationControlsProps) {
  const knownTotal = totalItems != null && Number.isFinite(totalItems)
  const totalPages = knownTotal
    ? Math.max(1, Math.ceil(Math.max(totalItems, 0) / pageSize) || 1)
    : null
  const hasPrev = page > 1
  const hasNext = knownTotal
    ? page < (totalPages ?? 1)
    : itemCount >= pageSize
  const rangeStart = itemCount > 0 ? (page - 1) * pageSize + 1 : 0
  const rangeEnd = (page - 1) * pageSize + itemCount

  const rangeLabel =
    itemCount === 0
      ? knownTotal
        ? `0 of ${totalItems}`
        : '0 results'
      : knownTotal
        ? `${rangeStart}–${rangeEnd} of ${totalItems}`
        : `${rangeStart}–${rangeEnd}`

  const pageLabel =
    totalPages != null
      ? `Page ${page} of ${totalPages}`
      : hasNext
        ? `Page ${page} (more available)`
        : `Page ${page}`

  return (
    <div className="pagination">
      <label>
        Per page
        <select
          value={pageSize}
          disabled={disabled}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <div className="pagination-meta">
        <span className="pagination-range">{rangeLabel}</span>
        <span className="pagination-pages">{pageLabel}</span>
      </div>

      <div className="pagination-nav">
        <button
          type="button"
          className="btn"
          disabled={disabled || !hasPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn"
          disabled={disabled || !hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
