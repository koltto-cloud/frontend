import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  xl?: boolean
}

export default function Modal({ title, onClose, children, wide, xl }: ModalProps) {
  const sizeClass = xl ? ' modal-xl' : wide ? ' modal-wide' : ''
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
