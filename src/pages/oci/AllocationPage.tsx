import PageHeader from '@/components/PageHeader'
import { allocationHelp } from '@/content/pageHelp'

export default function AllocationPage() {
  return (
    <div className="page">
      <PageHeader
        title="Allocations"
        lead="Map spend to teams and products with tags and chargeback rules. Tag sync is coming next."
        helpTitle="About Allocations"
        help={allocationHelp}
      />
      <p className="empty">No allocation rules yet — check back after tag support ships.</p>
    </div>
  )
}
