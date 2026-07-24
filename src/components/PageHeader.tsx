import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/Modal'

interface PageHeaderProps {
  title: string
  lead?: ReactNode
  helpTitle?: string
  help?: ReactNode
  /** Extra class on the outer header (e.g. dashboard-header) */
  className?: string
}

export default function PageHeader({
  title,
  lead,
  helpTitle,
  help,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation()
  const [helpOpen, setHelpOpen] = useState(false)
  const hasHelp = Boolean(help)
  const modalTitle = helpTitle ?? t('common.aboutTitle', { title })

  return (
    <>
      <header className={className ?? 'page-header'}>
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {hasHelp ? (
            <button
              type="button"
              className="page-help-btn"
              aria-label={modalTitle}
              title={modalTitle}
              onClick={() => setHelpOpen(true)}
            >
              ?
            </button>
          ) : null}
        </div>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </header>

      {helpOpen && help ? (
        <Modal title={modalTitle} onClose={() => setHelpOpen(false)} wide>
          <div className="help-modal-body">{help}</div>
        </Modal>
      ) : null}
    </>
  )
}
