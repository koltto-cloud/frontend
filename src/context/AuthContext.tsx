import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  apiRequest,
  clearTokens,
  fetchUserCompanies,
  logoutApi,
  type Company,
  type Connection,
  type User,
} from '@/api/client'

interface AuthContextValue {
  user: User | null
  companies: Company[]
  activeCompany: Company | null
  connection: Connection | null
  connections: Connection[]
  isLoading: boolean
  isAuthenticated: boolean
  setSessionTokens: (access: string, refresh: string) => void
  switchCompany: (companyId: string) => Promise<void>
  switchConnection: (connectionId: string) => void
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompany] = useState<Company | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [connection, setConnection] = useState<Connection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem('koltto_access_token'),
  )

  const isAuthenticated = !!accessToken

  const setSessionTokens = useCallback((access: string, refresh: string) => {
    localStorage.setItem('koltto_access_token', access)
    localStorage.setItem('koltto_refresh_token', refresh)
    setAccessToken(access)
  }, [])

  const clearSession = useCallback(() => {
    clearTokens()
    setAccessToken(null)
    setUser(null)
    setCompanies([])
    setActiveCompany(null)
    setConnections([])
    setConnection(null)
  }, [])

  const loadConnections = useCallback(async (companyId: string) => {
    try {
      const data = await apiRequest<Connection[]>(
        `/api/v1/cloud/connections/${companyId}`,
      )
      setConnections(data)
      const savedId = localStorage.getItem('koltto_selected_connection_id')
      const selected =
        (savedId ? data.find((c) => c.connection_id === savedId) : undefined) ?? data[0] ?? null
      setConnection(selected)
      if (selected) localStorage.setItem('koltto_selected_connection_id', selected.connection_id)
    } catch {
      setConnections([])
      setConnection(null)
    }
  }, [])

  const switchCompany = useCallback(
    async (companyId: string) => {
      const company = companies.find((c) => c.company_id === companyId) ?? null
      setActiveCompany(company)
      localStorage.setItem('koltto_selected_company_id', companyId)
      if (company) await loadConnections(companyId)
      else {
        setConnections([])
        setConnection(null)
      }
    },
    [companies, loadConnections],
  )

  const switchConnection = useCallback(
    (connectionId: string) => {
      const conn = connections.find((c) => c.connection_id === connectionId) ?? null
      setConnection(conn)
      if (conn) localStorage.setItem('koltto_selected_connection_id', conn.connection_id)
    },
    [connections],
  )

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('koltto_access_token')
    if (!token) {
      clearSession()
      setIsLoading(false)
      return false
    }

    setAccessToken(token)
    setIsLoading(true)
    try {
      const userData = await apiRequest<User>('/api/v1/identity/users/me')
      const companiesData = await fetchUserCompanies(userData.user_type)
      setUser(userData)
      setCompanies(companiesData)

      const savedCompanyId = localStorage.getItem('koltto_selected_company_id')
      const company =
        (savedCompanyId
          ? companiesData.find((c) => c.company_id === savedCompanyId)
          : undefined) ?? companiesData[0] ?? null

      if (company) {
        setActiveCompany(company)
        localStorage.setItem('koltto_selected_company_id', company.company_id)
        void loadConnections(company.company_id)
      }
      return true
    } catch (err) {
      console.error('refreshSession failed', err)
      clearSession()
      return false
    } finally {
      setIsLoading(false)
    }
  }, [clearSession, loadConnections])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const logout = useCallback(async () => {
    await logoutApi()
    clearSession()
    window.location.href = '/login'
  }, [clearSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        companies,
        activeCompany,
        connection,
        connections,
        isLoading,
        isAuthenticated,
        setSessionTokens,
        switchCompany,
        switchConnection,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

