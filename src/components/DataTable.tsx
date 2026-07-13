import { useClientPagination } from '@/hooks/useClientPagination'
import PaginationControls from '@/components/PaginationControls'

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('email' in (value as object)) return String((value as { email: string }).email)
    if ('name' in (value as object)) return String((value as { name: string }).name)
    if ('user_id' in (value as object)) return String((value as { user_id: string }).user_id)
    return JSON.stringify(value)
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  return String(value)
}

function getColumns(rows: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  for (const row of rows.slice(0, 20)) {
    Object.keys(row).forEach((k) => keys.add(k))
  }
  return Array.from(keys)
}

interface DataTableProps {
  rows: Record<string, unknown>[]
  columns?: string[]
  onRowClick?: (row: Record<string, unknown>) => void
  /** When false, render all rows with no pager. Default true. */
  paginate?: boolean
}

export default function DataTable({
  rows,
  columns,
  onRowClick,
  paginate = true,
}: DataTableProps) {
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)

  const visibleRows = paginate ? pageItems : rows

  if (rows.length === 0) return <p className="empty">No results.</p>

  const cols = columns ?? getColumns(rows)

  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {cols.map((col) => (
                  <td key={col}>{flattenValue(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginate && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          itemCount={pageItems.length}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  )
}
