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
  valuePrefix?: string
  valueSuffix?: string
  /** Prefer date-only x-axis labels (e.g. daily cost series). */
  dateOnly?: boolean
  height?: number
}

function formatTick(iso: string, dateOnly: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  if (dateOnly || /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTooltipLabel(iso: string, dateOnly: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  if (dateOnly || /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  return d.toLocaleString()
}

function formatValue(value: unknown, prefix: string, suffix: string): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${prefix}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
}

export default function TimeSeriesChart({
  points,
  valueLabel = 'Value',
  valuePrefix = '',
  valueSuffix = '',
  dateOnly = false,
  height = 280,
}: TimeSeriesChartProps) {
  if (points.length === 0) {
    return <p className="empty">No series data for this range.</p>
  }

  const yWidth = valuePrefix ? 56 : 48

  return (
    <div className="time-series-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => formatTick(String(v), dateOnly)}
            minTickGap={40}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickFormatter={(v: number) => formatValue(v, valuePrefix, valueSuffix)}
            width={yWidth}
          />
          <Tooltip
            labelFormatter={(label) => formatTooltipLabel(String(label), dateOnly)}
            formatter={(value) => [formatValue(value, valuePrefix, valueSuffix), valueLabel]}
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
