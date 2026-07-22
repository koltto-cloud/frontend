import type { ReactNode } from 'react'

/** Shared help copy for customer-facing pages (cloud-agnostic where possible). */

export const dashboardHelp: ReactNode = (
  <>
    <p>
      The Dashboard is your <strong>spend overview</strong> for the selected company and
      connection — period totals, daily trend, service and compartment breakdowns, and
      notable spikes.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Pick a company and cloud connection in the top bar.</li>
      <li>Choose a date preset or custom range.</li>
      <li>Optionally set a monthly budget to track projected month-end spend.</li>
    </ol>
    <h3>What you’ll see</h3>
    <ul>
      <li>Period total and daily average</li>
      <li>Cost by service and by compartment</li>
      <li>Savings / right-sizing opportunities when available</li>
      <li>Day-over-day spikes that may need investigation</li>
    </ul>
    <p>
      Use Cost Explorer when you want to drill into a service or compartment; use Budgets &amp;
      Alerts when you want thresholds and email notifications.
    </p>
  </>
)

export const costExplorerHelp: ReactNode = (
  <>
    <p>
      Cost Explorer is for <strong>interactive cost analysis</strong>: totals, daily trend, and
      breakdowns by service, compartment, and top resources.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Set the date range.</li>
      <li>Review the total and charts.</li>
      <li>
        Click a service or compartment bar to <strong>filter the daily trend</strong> to that
        slice.
      </li>
    </ol>
    <h3>When to use it</h3>
    <p>
      Start here when you need to answer “where did the money go?” or “what drove this week’s
      increase?” For CSV export, use Reports. For cost-per-customer style KPIs, use Unit
      Economics.
    </p>
  </>
)

export const recommendationsHelp: ReactNode = (
  <>
    <p>
      Recommendations surface <strong>actionable FinOps opportunities</strong> from monitoring and
      usage signals — idle or underused resources, right-sizing hints, and performance alerts.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Select a date range that matches the window you care about.</li>
      <li>Review estimated monthly savings vs performance alerts.</li>
      <li>Open a resource in Inventory or Monitoring to validate before changing anything.</li>
    </ol>
    <h3>How to read confidence</h3>
    <p>
      Lower confidence usually means thinner metrics history or noisier signals. Treat those as
      investigation leads, not automatic delete candidates.
    </p>
  </>
)

export const anomaliesHelp: ReactNode = (
  <>
    <p>
      Cost Anomalies highlight <strong>unusual spend changes</strong> versus recent baseline —
      spikes (and sometimes drops) that may indicate misconfiguration, runaway usage, or a new
      workload.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Pick the date range to scan.</li>
      <li>Open anomalies with the largest deltas first.</li>
      <li>Use the driver service (when shown) as a starting point in Cost Explorer.</li>
    </ol>
    <p>
      Pair with Budgets &amp; Alerts if you want email when similar events fire automatically.
    </p>
  </>
)

export const unitEconomicsHelp: ReactNode = (
  <>
    <p>
      This page answers one question:{' '}
      <strong>if I spread my cloud bill across a business count I care about, what is the cost of
      each?</strong>
    </p>
    <p>
      Example: your connected cloud spend for the date range is <strong>$12,000</strong>, and you
      have <strong>120 active customers</strong>. Cost each = $12,000 ÷ 120 ={' '}
      <strong>$100 per customer</strong>.
    </p>
    <p className="help-modal-formula">
      cost each = total cloud bill for the date range ÷ how many you have
    </p>

    <h3>How to use it</h3>
    <ol>
      <li>
        Under <em>Your business counts</em>, add what you want to divide by — e.g. name{' '}
        <em>Active customers</em>, counted as <em>customer</em>, how many <em>120</em>.
      </li>
      <li>Pick a date range (that sets which bill we use).</li>
      <li>
        Read <em>Cloud cost each</em> — that is the bill divided by your count.
      </li>
    </ol>

    <h3>What “counted as” and “how many” mean</h3>
    <ul>
      <li>
        <strong>How many</strong> — the number from your business (120 customers, 4000 seats, 2M
        API calls). Not a cloud meter.
      </li>
      <li>
        <strong>Counted as</strong> — the singular label for one of those (customer, seat, API
        call). Used only to display “$100 / customer”.
      </li>
    </ul>
    <p>
      “Unit” in FinOps just means “one of whatever you are counting.” We avoid that word in the UI
      because it sounds like a cloud usage unit.
    </p>

    <h3>What this does <em>not</em> do yet</h3>
    <ul>
      <li>It does not pick a service, resource, or tag — it uses the <strong>whole bill</strong> for
        the selected connection.</li>
      <li>It does not split cost per cloud or per resource. Use Cost Explorer for that.</li>
      <li>
        Cross-cloud totals and “cost per customer for Product X only” need Allocations/tags later.
      </li>
    </ul>
    <p>
      So today: good for “infra cost per customer / seat / order.” Not for “how much does this VM
      cost per customer.”
    </p>
  </>
)

export const reportsHelp: ReactNode = (
  <>
    <p>
      Reports exports a <strong>CSV cost report</strong> for the selected connection and date range
      — useful for finance handoff, audits, or offline analysis.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Choose start and end dates.</li>
      <li>Download the CSV.</li>
    </ol>
    <p>
      For interactive charts and drill-down, use Cost Explorer. For recurring budget governance,
      use Budgets &amp; Alerts.
    </p>
  </>
)

export const inventoryHelp: ReactNode = (
  <>
    <p>
      Inventory is the <strong>catalog of synced cloud resources</strong> for the selected
      connection — compute, storage, networking, and related objects by compartment/account.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Switch tabs by resource family.</li>
      <li>Filter by compartment when available.</li>
      <li>Use it as the source of truth for “what exists” before acting on recommendations.</li>
    </ol>
    <p>
      Monitoring shows runtime metrics for those resources; Recommendations uses utilization signals
      to suggest savings.
    </p>
  </>
)

export const monitoringHelp: ReactNode = (
  <>
    <p>
      Monitoring shows <strong>utilization and performance metrics</strong> collected for resources
      in the selected connection (CPU, memory, throughput, capacity gauges, and more depending on
      resource type).
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Pick resource type, optional compartment/resource, metric, and date range.</li>
      <li>Load metrics to view the chart and table (mean / min / max).</li>
      <li>Cross-check high-cost or idle candidates from Recommendations.</li>
    </ol>
    <p>
      Flat mean≈min≈max on capacity gauges (e.g. file system usage) is often expected; look at CPU
      and throughput for activity patterns.
    </p>
  </>
)

export const connectionsHelp: ReactNode = (
  <>
    <p>
      Connections are how Koltto <strong>authenticates to each cloud account</strong> (OCI today;
      AWS and others later). Each connection scopes inventory, monitoring, and cost sync.
    </p>
    <h3>How to use it</h3>
    <ol>
      <li>Create a connection with the required credentials for that cloud.</li>
      <li>Select it in the top bar when working in Costs or Resources.</li>
      <li>One company can have multiple connections across clouds over time.</li>
    </ol>
    <p>
      Cost features (Explorer, budgets, unit economics) currently run against the active
      connection’s synced data.
    </p>
  </>
)

export const budgetsHelp: ReactNode = (
  <>
    <p>
      Budgets &amp; Alerts let you set <strong>spend caps and notification rules</strong> so cost
      surprises don’t wait for someone to open the dashboard.
    </p>
    <h3>Budgets</h3>
    <ol>
      <li>Create a budget with amount, period, and scope (whole account, service, or compartment).</li>
      <li>Set an alert threshold percentage (e.g. notify at 80% of budget).</li>
      <li>Use a template to start from a common pattern.</li>
    </ol>
    <h3>Alert preferences</h3>
    <p>
      Choose which events email you — anomalies, recommendations, and/or budget threshold crosses —
      and who receives them.
    </p>
    <h3>What’s next</h3>
    <p>
      Tag- and org-scoped budgets (cross-cloud) will land with Allocations. Today scopes are
      account / service / compartment on the selected connection.
    </p>
  </>
)

export const allocationHelp: ReactNode = (
  <>
    <p>
      Allocations will map cloud spend to <strong>your org structure</strong> — teams, products, and
      cost centers — primarily via <strong>tags</strong> (and related rules).
    </p>
    <h3>Why it matters</h3>
    <ul>
      <li>Chargeback / showback by team</li>
      <li>Budgets per org or tag</li>
      <li>Unit economics filtered to a product or environment</li>
      <li>Comparable cost across clouds using the same tag vocabulary</li>
    </ul>
    <h3>Status</h3>
    <p>
      This page is a placeholder until tag sync and allocation rules ship. Provider cost data will
      stay per-cloud in the database; allocation rules and budgets sit in a shared governance layer
      on top.
    </p>
    <p>
      Unit Economics stays — tags attribute spend; business metrics turn that spend into cost-per-X.
    </p>
  </>
)
