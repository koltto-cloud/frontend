import { useState } from 'react'
import { formatColumnLabel } from '@/utils/formatLabel'

function formatScalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  const str = String(value)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const d = new Date(str)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  }
  return str
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ObjectFields({ data, depth = 0 }: { data: Record<string, unknown>; depth?: number }) {
  const entries = Object.entries(data)
  if (entries.length === 0) {
    return <p className="detail-empty">No fields.</p>
  }

  return (
    <dl className={`detail-list${depth > 0 ? ' detail-list-nested' : ''}`}>
      {entries.map(([key, value]) => (
        <div key={key} className="detail-item">
          <dt>{formatColumnLabel(key)}</dt>
          <dd>
            {isPlainObject(value) ? (
              <ObjectFields data={value} depth={depth + 1} />
            ) : Array.isArray(value) ? (
              value.length === 0 ? (
                '—'
              ) : value.every((item) => !isPlainObject(item) && !Array.isArray(item)) ? (
                <ul className="detail-array">
                  {value.map((item, i) => (
                    <li key={i}>{formatScalar(item)}</li>
                  ))}
                </ul>
              ) : (
                <pre className="detail-inline-json">{JSON.stringify(value, null, 2)}</pre>
              )
            ) : (
              formatScalar(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

interface JsonViewerProps {
  data: unknown
  /** Default presentation. Detail modals use "fields". */
  defaultMode?: 'fields' | 'json'
}

export default function JsonViewer({ data, defaultMode = 'fields' }: JsonViewerProps) {
  const [mode, setMode] = useState<'fields' | 'json'>(defaultMode)

  return (
    <div className="detail-viewer">
      <div className="detail-viewer-toolbar" role="tablist" aria-label="Detail view mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'fields'}
          className={`detail-view-tab${mode === 'fields' ? ' active' : ''}`}
          onClick={() => setMode('fields')}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'json'}
          className={`detail-view-tab${mode === 'json' ? ' active' : ''}`}
          onClick={() => setMode('json')}
        >
          JSON
        </button>
      </div>

      {mode === 'json' ? (
        <pre className="json-viewer">{JSON.stringify(data, null, 2)}</pre>
      ) : isPlainObject(data) ? (
        <ObjectFields data={data} />
      ) : Array.isArray(data) ? (
        <ObjectFields
          data={Object.fromEntries(data.map((item, index) => [`Item ${index + 1}`, item]))}
        />
      ) : (
        <p className="detail-scalar">{formatScalar(data)}</p>
      )}
    </div>
  )
}
