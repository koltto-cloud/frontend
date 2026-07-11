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
}

export default function DataTable({ rows, columns, onRowClick }: DataTableProps) {
  if (rows.length === 0) return <p className="empty">No results.</p>

  const cols = columns ?? getColumns(rows)

  return (
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
          {rows.map((row, i) => (
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
  )
}
