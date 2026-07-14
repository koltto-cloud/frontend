import { useState } from 'react'
import { apiRequest, formatApiError } from '@/api/client'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useClientPagination } from '@/hooks/useClientPagination'
import { Alert } from '@/components/Alert'
import PaginationControls from '@/components/PaginationControls'
import Modal from '@/components/Modal'
import JsonViewer from '@/components/JsonViewer'

interface SubscriptionItemRow {
  subscription_id: string
  company_name: string
  plan_name: string
  feature_name: string
  sku: string
  status: string
}

export default function SubscriptionItemsPage() {
  const [subscriptionId, setSubscriptionId] = useState('')
  const [planFeatureId, setPlanFeatureId] = useState('')
  const [err, setErr] = useState('')

  const [viewKey, setViewKey] = useState<{ subscriptionId: string; planFeatureId: string } | null>(null)
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const { data, error, loading, reload } = useAsyncData(
    () =>
      apiRequest<SubscriptionItemRow[]>('/api/v1/catalog/subscription_item/list', {
        query: {
          subscription_id: subscriptionId || undefined,
          plan_feature_id: planFeatureId || undefined,
        },
      }),
    [subscriptionId, planFeatureId],
  )

  const rows = data ?? []
  const { page, pageSize, pageItems, totalItems, setPage, setPageSize } =
    useClientPagination(rows)


  const openView = async (subId: string) => {
    const pfId = prompt('Enter plan_feature_id for this subscription item:')
    if (!pfId) return
    setViewKey({ subscriptionId: subId, planFeatureId: pfId })
    setViewData(null)
    setViewLoading(true)
    setErr('')
    try {
      setViewData(await apiRequest(`/api/v1/catalog/subscription_item/${subId}/${pfId}`))
    } catch (e) {
      setErr(formatApiError(e))
      setViewKey(null)
    } finally {
      setViewLoading(false)
    }
  }

  return (
    <>
      <h1 className="page-title">Subscription Items</h1>
      <p className="alert alert-info" style={{ marginTop: 0 }}>
        Subscription items are <strong>not created directly</strong>. They are auto-generated when you
        create a subscription: the backend copies every plan feature from the selected plan into
        subscription items. Flow: Features → Plan → Plan Features →{' '}
        <a href="/billing/subscriptions">Create subscription</a> → view items here.
      </p>
      <div className="filters">
        <label>Subscription ID <input value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} /></label>
        <label>Plan feature ID <input value={planFeatureId} onChange={(e) => setPlanFeatureId(e.target.value)} /></label>
        <button type="button" className="btn btn-primary" onClick={() => void reload()}>Search</button>
      </div>
      <Alert type="error">{error || err}</Alert>
      {loading ? <p className="loading">Loading…</p> : (
        <>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subscription ID</th><th>Company</th><th>Plan</th><th>Feature</th><th>SKU</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => (
                <tr key={`${row.subscription_id}-${row.sku}`}>
                  <td>
                    <button type="button" className="id-link" onClick={() => void openView(row.subscription_id)}>
                      {row.subscription_id.slice(0, 8)}…
                    </button>
                  </td>
                  <td>{row.company_name}</td>
                  <td>{row.plan_name}</td>
                  <td>{row.feature_name}</td>
                  <td>{row.sku}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {!loading && rows.length > 0 && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          itemCount={pageItems.length}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
        </>
      )}
      {viewKey && (
        <Modal title="Subscription item details" onClose={() => setViewKey(null)} wide>
          {viewLoading ? <p className="loading">Loading…</p> : viewData && <JsonViewer data={viewData} />}
        </Modal>
      )}
    </>
  )
}
