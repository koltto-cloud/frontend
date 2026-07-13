export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

interface PaginationControlsProps {
  page: number
  pageSize: number
  itemCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  disabled?: boolean
}

export default function PaginationControls({
  page,
  pageSize,
  itemCount,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationControlsProps) {
  const hasPrev = page > 1
  const hasNext = itemCount >= pageSize
  const rangeStart = itemCount > 0 ? (page - 1) * pageSize + 1 : 0
  const rangeEnd = (page - 1) * pageSize + itemCount

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

      <span className="pagination-range">
        {itemCount > 0 ? `${rangeStart}–${rangeEnd}` : '0 results'}
      </span>

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
