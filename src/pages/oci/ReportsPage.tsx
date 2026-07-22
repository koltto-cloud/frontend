import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequestText, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { reportsHelp } from '@/content/pageHelp'

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { activeCompany, connection } = useAuth()
  const companyId = activeCompany?.company_id
  const connectionId = connection?.connection_id
  const defaults = defaultDateRange()

  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const download = async () => {
    if (!companyId || !connectionId) return
    setError('')
    setLoading(true)
    try {
      const text = await apiRequestText(
        `/api/v1/reports/${companyId}/connections/${connectionId}/cost.csv`,
        { query: { start_date: startDate, end_date: endDate } },
      )
      downloadCsv(`koltto-cost-${startDate}-${endDate}.csv`, text)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (!companyId || !connectionId) {
    return (
      <div className="page">
        <PageHeader title="Reports" helpTitle="About Reports" help={reportsHelp} />
        <p className="empty">
          Select a company and cloud connection in the top bar.
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">Set up a connection</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        lead="Download a CSV cost report for the selected date range."
        helpTitle="About Reports"
        help={reportsHelp}
      />

      <div className="filters">
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => void download()}
        >
          {loading ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      <Alert type="error">{error}</Alert>
    </div>
  )
}
