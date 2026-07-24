import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiRequestText, formatApiError } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { Alert } from '@/components/Alert'
import PageHeader from '@/components/PageHeader'
import { ReportsHelp } from '@/content/pageHelp'

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
  const { t } = useTranslation()
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
        <PageHeader
          title={t('pages.reports.title')}
          helpTitle={t('pages.reports.helpTitle')}
          help={<ReportsHelp />}
        />
        <p className="empty">
          {t('reports.selectContext')}
          {companyId && !connectionId ? (
            <>
              {' '}
              <Link to="/connections">{t('reports.setupConnection')}</Link>
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title={t('pages.reports.title')}
        lead={t('pages.reports.lead')}
        helpTitle={t('pages.reports.helpTitle')}
        help={<ReportsHelp />}
      />

      <div className="filters">
        <label>
          {t('reports.startDate')}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          {t('reports.endDate')}
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={() => void download()}
        >
          {loading ? t('reports.preparing') : t('reports.downloadCsv')}
        </button>
      </div>

      <Alert type="error">{error}</Alert>
    </div>
  )
}
