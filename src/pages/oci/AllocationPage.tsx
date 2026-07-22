export default function AllocationPage() {
  return (
    <div className="page">
      <header className="dashboard-header">
        <h1 className="page-title">Allocations</h1>
        <p className="page-lead">
          Team and tag-based cost allocation is coming soon. Tag sync is deferred until inventory
          tagging lands; this page will let you map spend to teams and chargeback rules.
        </p>
      </header>
      <p className="empty">No allocation rules yet — check back after tag support ships.</p>
    </div>
  )
}
