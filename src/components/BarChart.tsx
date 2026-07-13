interface BarChartProps {
  items: { label: string; value: number; title?: string }[]
  formatValue?: (value: number) => string
}

export default function BarChart({ items, formatValue = (v) => v.toFixed(2) }: BarChartProps) {
  if (items.length === 0) return <p className="empty">No data.</p>

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="bar-chart">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="bar-row">
          <span className="bar-label" title={item.title ?? item.label}>
            {item.label}
          </span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="bar-value">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  )
}
