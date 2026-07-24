import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/PageHeader'
import { allocationHelp } from '@/content/pageHelp'

export default function AllocationPage() {
  const { t } = useTranslation()

  return (
    <div className="page">
      <PageHeader
        title={t('pages.allocations.title')}
        lead={t('pages.allocations.lead')}
        helpTitle={t('pages.allocations.helpTitle')}
        help={allocationHelp}
      />
      <p className="empty">No allocation rules yet — check back after tag support ships.</p>
    </div>
  )
}
