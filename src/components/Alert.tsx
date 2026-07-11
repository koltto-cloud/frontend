export function Alert({ type, children }: { type: 'error' | 'success' | 'info'; children: string }) {
  if (!children) return null
  return <div className={`alert alert-${type}`}>{children}</div>
}
