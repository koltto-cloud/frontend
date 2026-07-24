import { useTranslation } from 'react-i18next'

/** Shared help copy for customer-facing pages (cloud-agnostic where possible). */

export function DashboardHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.dashboard.intro')}</p>
      <h3>{t('help.dashboard.howToTitle')}</h3>
      <ol>
        <li>{t('help.dashboard.howTo1')}</li>
        <li>{t('help.dashboard.howTo2')}</li>
      </ol>
      <h3>{t('help.dashboard.whatYouSeeTitle')}</h3>
      <ul>
        <li>{t('help.dashboard.see1')}</li>
        <li>{t('help.dashboard.see2')}</li>
        <li>{t('help.dashboard.see3')}</li>
        <li>{t('help.dashboard.see4')}</li>
      </ul>
      <p>{t('help.dashboard.footer')}</p>
    </>
  )
}

export function CostExplorerHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.costExplorer.intro')}</p>
      <h3>{t('help.costExplorer.howToTitle')}</h3>
      <ol>
        <li>{t('help.costExplorer.howTo1')}</li>
        <li>{t('help.costExplorer.howTo2')}</li>
        <li>{t('help.costExplorer.howTo3')}</li>
        <li>{t('help.costExplorer.howTo4')}</li>
      </ol>
      <h3>{t('help.costExplorer.scopeTitle')}</h3>
      <p>{t('help.costExplorer.scopeBody')}</p>
      <h3>{t('help.costExplorer.whenTitle')}</h3>
      <p>{t('help.costExplorer.whenBody')}</p>
    </>
  )
}

export function RecommendationsHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.recommendations.intro')}</p>
      <h3>{t('help.recommendations.howToTitle')}</h3>
      <ol>
        <li>{t('help.recommendations.howTo1')}</li>
        <li>{t('help.recommendations.howTo2')}</li>
        <li>{t('help.recommendations.howTo3')}</li>
        <li>{t('help.recommendations.howTo4')}</li>
      </ol>
      <h3>{t('help.recommendations.confidenceTitle')}</h3>
      <p>{t('help.recommendations.confidenceBody')}</p>
    </>
  )
}

export function AnomaliesHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.anomalies.intro')}</p>
      <h3>{t('help.anomalies.howToTitle')}</h3>
      <ol>
        <li>{t('help.anomalies.howTo1')}</li>
        <li>{t('help.anomalies.howTo2')}</li>
        <li>{t('help.anomalies.howTo3')}</li>
      </ol>
      <p>{t('help.anomalies.footer')}</p>
    </>
  )
}

export function UnitEconomicsHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.unitEconomics.intro')}</p>
      <p>{t('help.unitEconomics.example')}</p>
      <p className="help-modal-formula">{t('help.unitEconomics.formula')}</p>
      <h3>{t('help.unitEconomics.howToTitle')}</h3>
      <ol>
        <li>{t('help.unitEconomics.howTo1')}</li>
        <li>{t('help.unitEconomics.howTo2')}</li>
        <li>{t('help.unitEconomics.howTo3')}</li>
      </ol>
      <h3>{t('help.unitEconomics.termsTitle')}</h3>
      <ul>
        <li>{t('help.unitEconomics.terms1')}</li>
        <li>{t('help.unitEconomics.terms2')}</li>
      </ul>
      <h3>{t('help.unitEconomics.limitsTitle')}</h3>
      <ul>
        <li>{t('help.unitEconomics.limits1')}</li>
        <li>{t('help.unitEconomics.limits2')}</li>
        <li>{t('help.unitEconomics.limits3')}</li>
      </ul>
      <p>{t('help.unitEconomics.footer')}</p>
    </>
  )
}

export function ReportsHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.reports.intro')}</p>
      <h3>{t('help.reports.howToTitle')}</h3>
      <ol>
        <li>{t('help.reports.howTo1')}</li>
        <li>{t('help.reports.howTo2')}</li>
      </ol>
      <p>{t('help.reports.footer')}</p>
    </>
  )
}

export function InventoryHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.inventory.intro')}</p>
      <h3>{t('help.inventory.howToTitle')}</h3>
      <ol>
        <li>{t('help.inventory.howTo1')}</li>
        <li>{t('help.inventory.howTo2')}</li>
        <li>{t('help.inventory.howTo3')}</li>
      </ol>
      <p>{t('help.inventory.footer')}</p>
    </>
  )
}

export function MonitoringHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.monitoring.intro')}</p>
      <h3>{t('help.monitoring.howToTitle')}</h3>
      <ol>
        <li>{t('help.monitoring.howTo1')}</li>
        <li>{t('help.monitoring.howTo2')}</li>
        <li>{t('help.monitoring.howTo3')}</li>
        <li>{t('help.monitoring.howTo4')}</li>
      </ol>
      <p>{t('help.monitoring.footer')}</p>
    </>
  )
}

export function ConnectionsHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.connections.intro')}</p>
      <h3>{t('help.connections.howToTitle')}</h3>
      <ol>
        <li>{t('help.connections.howTo1')}</li>
        <li>{t('help.connections.howTo2')}</li>
        <li>{t('help.connections.howTo3')}</li>
      </ol>
      <p>{t('help.connections.footer')}</p>
    </>
  )
}

export function BudgetsHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.budgets.intro')}</p>
      <h3>{t('help.budgets.howToTitle')}</h3>
      <ol>
        <li>{t('help.budgets.howTo1')}</li>
        <li>{t('help.budgets.howTo2')}</li>
        <li>{t('help.budgets.howTo3')}</li>
      </ol>
      <h3>{t('help.budgets.alertsTitle')}</h3>
      <p>{t('help.budgets.alertsBody')}</p>
      <h3>{t('help.budgets.nextTitle')}</h3>
      <p>{t('help.budgets.nextBody')}</p>
    </>
  )
}

export function AllocationHelp() {
  const { t } = useTranslation()
  return (
    <>
      <p>{t('help.allocations.intro')}</p>
      <h3>{t('help.allocations.howToTitle')}</h3>
      <ul>
        <li>{t('help.allocations.howTo1')}</li>
        <li>{t('help.allocations.howTo2')}</li>
        <li>{t('help.allocations.howTo3')}</li>
        <li>{t('help.allocations.howTo4')}</li>
      </ul>
      <h3>{t('help.allocations.statusTitle')}</h3>
      <p>{t('help.allocations.statusBody')}</p>
      <p>{t('help.allocations.footer')}</p>
    </>
  )
}
