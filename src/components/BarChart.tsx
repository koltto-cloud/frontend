import { useTranslation } from 'react-i18next'

export interface BarChartItem {
  label: string
  value: number
  title?: string
  /** Optional stable key for click handlers (e.g. service name, compartment id). */
  id?: string
  /** Optional metadata for click handlers (e.g. resource service). */
  service?: string | null
}

interface BarChartProps {
  items: BarChartItem[]
  formatValue?: (value: number) => string
  /** Softer fill/typography when used on the dashboard. */
  variant?: 'default' | 'dashboard'
  onItemClick?: (item: BarChartItem, index: number) => void
}

export default function BarChart({
  items,
  formatValue = (v) => v.toFixed(2),
  variant = 'default',
  onItemClick,
}: BarChartProps) {
  const { t } = useTranslation()

  if (items.length === 0) return <p className="empty">{t('common.noData')}</p>

  const max = Math.max(...items.map((i) => i.value), 1)
  const clickable = Boolean(onItemClick)

  return (
    <div className={`bar-chart${variant === 'dashboard' ? ' bar-chart--dashboard' : ''}`}>
      {items.map((item, index) => (
        <div
          key={`${item.id ?? item.label}-${index}`}
          className={`bar-row${clickable ? ' bar-row--clickable' : ''}`}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={clickable ? () => onItemClick?.(item, index) : undefined}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onItemClick?.(item, index)
                  }
                }
              : undefined
          }
        >
          <span className="bar-label" title={item.title ?? item.label}>
            {item.label}
          </span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="bar-value">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  )
}
