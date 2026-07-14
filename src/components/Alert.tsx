import type { ReactNode } from 'react'

export function Alert({
  type,
  children,
}: {
  type: 'error' | 'success' | 'info' | 'warning'
  children: ReactNode
}) {
  if (!children) return null
  return <div className={`alert alert-${type}`}>{children}</div>
}
