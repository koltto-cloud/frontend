import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Optional lead copy under the title (brand: 13px, ~70% opacity). */
  description?: ReactNode
  /** Footer actions — brand layout is Cancel (secondary) + confirm (primary), right-aligned. */
  actions?: ReactNode
  wide?: boolean
  xl?: boolean
}

export default function Modal({
  title,
  onClose,
  children,
  description,
  actions,
  wide,
  xl,
}: ModalProps) {
  const sizeClass = xl ? ' modal-xl' : wide ? ' modal-wide' : ''

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div className="modal-heading">
            <h2 id="modal-title">{title}</h2>
            {description ? <div className="modal-description">{description}</div> : null}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  )
}
