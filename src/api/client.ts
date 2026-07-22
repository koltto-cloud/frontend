export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type?: string
  requires_totp?: boolean
  temp_token?: string | null
}

export interface User {
  user_id: string
  email: string
  first_name: string
  last_name: string
  user_type: string
  account_status: string
  created_at?: string
  updated_at?: string
}

export interface Company {
  company_id: string
  name: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface Connection {
  connection_id: string
  company_id: string
  name?: string
  tenancy_ocid?: string
  region?: string
  status?: string
  created_at?: string
}

export interface Membership {
  user: { user_id: string; email: string; first_name: string; last_name: string }
  company: { company_id: string; name: string }
  role: string
  active: boolean
  created_at?: string
  updated_at?: string
}

function isStaffUser(userType: string) {
  return userType === 'staff' || userType === 'super_admin'
}

export async function fetchUserCompanies(userType: string): Promise<Company[]> {
  if (isStaffUser(userType)) {
    return apiRequest<Company[]>('/api/v1/identity/companies/list')
  }

  const memberships = await apiRequest<Membership[]>('/api/v1/identity/memberships/me')
  return memberships
    .filter((m) => m.active)
    .map((m) => ({
      company_id: m.company.company_id,
      name: m.company.name,
    }))
}

export interface ApiError {
  detail?: string | { msg: string; type: string }[]
  message?: string
}

export class RequestError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed (${status})`)
    this.status = status
    this.body = body
  }
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false
  const msg = err.message.toLowerCase()
  // Chrome: "Failed to fetch"; Safari/WebKit: "Load failed"; Firefox: "NetworkError when attempting to fetch resource"
  return msg.includes('fetch') || msg.includes('load failed') || msg.includes('networkerror')
}

export function formatApiError(err: unknown): string {
  if (isNetworkError(err)) {
    return 'Network error — could not reach the API. The backend may be redeploying or temporarily unavailable.'
  }
  if (err instanceof RequestError) {
    const body = err.body as ApiError
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) return body.detail.map((d) => d.msg).join(', ')
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

function getAccessToken(): string | null {
  return localStorage.getItem('koltto_access_token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('koltto_refresh_token')
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('koltto_access_token', access)
  localStorage.setItem('koltto_refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('koltto_access_token')
  localStorage.removeItem('koltto_refresh_token')
  localStorage.removeItem('koltto_selected_company_id')
  localStorage.removeItem('koltto_selected_connection_id')
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  const refreshUrl = new URL('/api/v1/auth/login/refresh', API_URL || window.location.origin)
  const res = await fetch(refreshUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })

  if (!res.ok) return null

  const data = (await res.json()) as TokenResponse
  setTokens(data.access_token, data.refresh_token)
  return data.access_token
}

export interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  form?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
}

async function authorizedFetch(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { method = 'GET', body, auth = true, form, query, headers: extraHeaders } = options

  const url = new URL(path, API_URL || window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const headers: Record<string, string> = { ...extraHeaders }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const fetchInit: RequestInit = {
    method,
    headers,
    body: form
      ? new URLSearchParams(form)
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  }

  let res = await fetch(url.toString(), fetchInit)

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`
      res = await fetch(url.toString(), fetchInit)
    }
  }

  return res
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await authorizedFetch(path, options)
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    throw new RequestError(res.status, data, formatApiError(new RequestError(res.status, data)))
  }

  return data as T
}

/** Fetch a non-JSON response (CSV, plain text) with the same auth/refresh behavior. */
export async function apiRequestText(
  path: string,
  options: RequestOptions = {},
): Promise<string> {
  const res = await authorizedFetch(path, options)
  const text = await res.text()

  if (!res.ok) {
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { detail: text || `Request failed (${res.status})` }
    }
    throw new RequestError(res.status, data, formatApiError(new RequestError(res.status, data)))
  }

  return text
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/login/token', {
    method: 'POST',
    auth: false,
    form: { username: email, password },
  })
}

export async function loginTotp(tempToken: string, code: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/login/token/totp', {
    method: 'POST',
    auth: false,
    body: { temp_token: tempToken, code },
  })
}

export async function logoutApi() {
  const refresh = getRefreshToken()
  if (!refresh) return
  try {
    await apiRequest('/api/v1/auth/logout/logout', {
      method: 'POST',
      body: { refresh_token: refresh },
    })
  } catch {
    // ignore logout errors
  }
}
