import type { ReactNode } from 'react'

const ICONS: Record<'error' | 'success' | 'info' | 'warning' | 'muted', ReactNode> = {
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5 11 15l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 4.5 21 19.5H3L12 4.5Z" strokeLinejoin="round" />
      <path d="M12 10v4.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" strokeLinecap="round" />
    </svg>
  ),
  muted: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
}

export function Alert({
  type,
  children,
}: {
  type: 'error' | 'success' | 'info' | 'warning' | 'muted'
  children: ReactNode
}) {
  if (!children) return null
  return (
    <div className={`alert alert-${type}`} role="status">
      <span className="alert-icon">{ICONS[type]}</span>
      <div className="alert-message">{children}</div>
    </div>
  )
}
