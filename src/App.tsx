import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/identity/UsersPage'
import CompaniesPage from '@/pages/identity/CompaniesPage'
import MembershipsPage from '@/pages/identity/MembershipsPage'
import AuditLogsPage from '@/pages/audit/AuditLogsPage'
import ProfilePage from '@/pages/ProfilePage'
import PlansPage from '@/pages/catalog/PlansPage'
import FeaturesPage from '@/pages/catalog/FeaturesPage'
import SubscriptionItemsPage from '@/pages/catalog/SubscriptionItemsPage'
import SubscriptionsPage from '@/pages/billing/SubscriptionsPage'
import InvoicesPage from '@/pages/billing/InvoicesPage'
import InvoiceItemsPage from '@/pages/billing/InvoiceItemsPage'
import ConnectionsPage from '@/pages/oci/ConnectionsPage'
import UsagePage from '@/pages/oci/UsagePage'
import InventoryPage from '@/pages/oci/InventoryPage'
import MonitoringPage from '@/pages/oci/MonitoringPage'
import PricingPage from '@/pages/oci/PricingPage'
import MaintenancePage from '@/pages/admin/MaintenancePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/memberships" element={<MembershipsPage />} />
              <Route path="/audit" element={<AuditLogsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin/maintenance" element={<MaintenancePage />} />
              <Route path="/catalog/plans" element={<PlansPage />} />
              <Route path="/catalog/features" element={<FeaturesPage />} />
              <Route path="/catalog/plan-features" element={<Navigate to="/catalog/plans" replace />} />
              <Route path="/catalog/subscription-items" element={<SubscriptionItemsPage />} />
              <Route path="/billing/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/billing/invoices" element={<InvoicesPage />} />
              <Route path="/billing/invoice-items" element={<InvoiceItemsPage />} />
              <Route path="/oci/connections" element={<ConnectionsPage />} />
              <Route path="/oci/usage" element={<UsagePage />} />
              <Route path="/oci/inventory" element={<InventoryPage />} />
              <Route path="/oci/resources" element={<Navigate to="/oci/inventory" replace />} />
              <Route path="/oci/monitoring" element={<MonitoringPage />} />
              <Route path="/oci/pricing" element={<PricingPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
