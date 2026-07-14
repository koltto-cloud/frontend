import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface TimeSeriesPoint {
  /** ISO timestamp or display label */
  t: string
  value: number | null
}

interface TimeSeriesChartProps {
  points: TimeSeriesPoint[]
  valueLabel?: string
  valueSuffix?: string
  height?: number
}

function formatTick(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTooltipLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function TimeSeriesChart({
  points,
  valueLabel = 'Value',
  valueSuffix = '',
  height = 280,
}: TimeSeriesChartProps) {
  if (points.length === 0) {
    return <p className="empty">No series data for this range.</p>
  }

  return (
    <div className="time-series-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="t"
            tickFormatter={formatTick}
            minTickGap={40}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickFormatter={(v: number) => `${v}${valueSuffix}`}
            width={48}
          />
          <Tooltip
            labelFormatter={(label) => formatTooltipLabel(String(label))}
            formatter={(value) => [
              value == null || Number.isNaN(Number(value))
                ? '—'
                : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${valueSuffix}`,
              valueLabel,
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke="var(--accent)"
            fill="rgba(37, 99, 235, 0.15)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
