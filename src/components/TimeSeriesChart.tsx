import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface TimeSeriesPoint {
  /** ISO timestamp or display label */
  t: string
  value?: number | null
  [key: string]: string | number | null | undefined
}

export interface TimeSeriesSeries {
  key: string
  label: string
  color?: string
  /** 'area' (default) or 'line' */
  type?: 'area' | 'line'
}

export interface TimeSeriesReferenceLine {
  y: number
  label?: string
  color?: string
}

interface TimeSeriesChartProps {
  points: TimeSeriesPoint[]
  /** Single-series label (when using points[].value). Ignored if `series` is set. */
  valueLabel?: string
  valuePrefix?: string
  valueSuffix?: string
  /** Multi-series config. Each series.key must exist on points. */
  series?: TimeSeriesSeries[]
  referenceLines?: TimeSeriesReferenceLine[]
  /** Prefer date-only x-axis labels (e.g. daily cost series). */
  dateOnly?: boolean
  height?: number
  /** Fix Y domain (e.g. [0, 100] for percent charts). */
  yDomain?: [number | string, number | string]
}

const SERIES_COLORS = [
  'var(--cloud-aws)',
  'var(--cloud-oci)',
  'var(--cloud-gcp)',
  'var(--cloud-azure)',
]

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
  series,
  referenceLines,
  dateOnly = false,
  height = 280,
  yDomain,
}: TimeSeriesChartProps) {
  if (points.length === 0) {
    return <p className="empty">No series data for this range.</p>
  }

  const multi = series && series.length > 0
  const yWidth = valuePrefix || valueSuffix ? 56 : 48

  return (
    <div className="time-series-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={points} margin={{ top: 10, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--line)" />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => formatTick(String(v), dateOnly)}
            minTickGap={40}
            tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            tickFormatter={(v: number) => formatValue(v, valuePrefix, valueSuffix)}
            width={yWidth}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-panel)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--ink)', fontFamily: 'var(--font-body)', marginBottom: 4 }}
            labelFormatter={(label) => formatTooltipLabel(String(label), dateOnly)}
            formatter={(value, name) => [
              formatValue(value, valuePrefix, valueSuffix),
              String(name),
            ]}
          />
          {multi ? <Legend /> : null}
          {(referenceLines ?? []).map((line) => (
            <ReferenceLine
              key={`ref-${line.y}-${line.label ?? ''}`}
              y={line.y}
              stroke={line.color ?? 'var(--muted)'}
              strokeDasharray="4 4"
              label={
                line.label
                  ? {
                      value: line.label,
                      position: 'insideTopRight',
                      fill: 'var(--muted)',
                      fontSize: 11,
                    }
                  : undefined
              }
            />
          ))}
          {multi ? (
            series!.slice(0, 4).map((s, i) => {
              const color = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]
              // Brand: multi-series = lines only, no area fill
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                  connectNulls={false}
                />
              )
            })
          ) : (
            <Area
              type="monotone"
              dataKey="value"
              name={valueLabel}
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.12}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--primary)' }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
