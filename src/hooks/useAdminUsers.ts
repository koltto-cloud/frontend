// @ts-nocheck
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { closeModalFromForm } from '../utils/modal';

/** GET /api/admin/users/table */
export type AdminUserRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  user_type: string;
  account_status: string;
};

export function formatUserDisplayName(user: AdminUserRow): string {
  const n = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return n || '—';
}

export function accountStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_invite: 'Pending',
    active: 'Active',
    suspended: 'Suspended',
    inactive: 'Inactive',
  };
  return map[status] ?? status;
}

/** Button label: Pending (invite) | Suspend | Reactivate */
export function userStatusActionLabel(user: AdminUserRow): string {
  if (user.account_status === 'pending_invite') return 'Pending';
  if (user.account_status === 'active') return 'Suspend';
  if (user.account_status === 'suspended') return 'Reactivate';
  return '—';
}

export function userTypeLabel(t: string): string {
  return t === 'staff' ? 'Staff' : t === 'customer' ? 'Customer' : t;
}

export function userStatusBadgeClass(status: string): string {
  if (status === 'active') return 'badge fw-semibold rounded-pill text-success bg-success bg-opacity-10';
  if (status === 'pending_invite') return 'badge fw-semibold rounded-pill text-info bg-info bg-opacity-10';
  if (status === 'suspended') return 'badge fw-semibold rounded-pill text-warning bg-warning bg-opacity-25';
  if (status === 'inactive') return 'badge fw-semibold rounded-pill text-secondary bg-secondary bg-opacity-10';
  return 'badge fw-semibold rounded-pill text-secondary bg-secondary bg-opacity-10';
}

export function userTypeBadgeClass(userType: string): string {
  if (userType === 'staff') return 'badge fw-semibold rounded-pill text-primary bg-primary bg-opacity-10';
  if (userType === 'customer') return 'badge fw-semibold rounded-pill text-secondary bg-secondary bg-opacity-10';
  return 'badge fw-semibold rounded-pill text-secondary bg-secondary bg-opacity-10';
}

const API_URL = import.meta.env.VITE_API_URL ?? '';

async function apiRequest(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem('cloudey_access_token');
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} -> ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function useAdminUsers() {
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [createFirst, setCreateFirst] = useState('');
  const [createLast, setCreateLast] = useState('');
  const [createEmail, setCreateEmail] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiRequest('/api/admin/users/table');
      setUserRows(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('Failed to load users table', err);
      setUserRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const openCreateModal = useCallback(() => {
    setCreateFirst('');
    setCreateLast('');
    setCreateEmail('');
    // TODO [cloudey]: show Bootstrap modal #adminUserCreateModal
  }, []);

  const handleCreateSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const formEl = e.currentTarget as HTMLFormElement;
      setCreating(true);
      try {
        await apiRequest('/api/admin/users/', {
          method: 'POST',
          body: JSON.stringify({
            email: createEmail.trim(),
            first_name: createFirst.trim() || null,
            last_name: createLast.trim() || null,
          }),
        });
        await loadRows();
        setCreateFirst('');
        setCreateLast('');
        setCreateEmail('');
        closeModalFromForm(formEl);
      } catch (err) {
        console.error('Failed to create user', err);
      } finally {
        setCreating(false);
      }
    },
    [createEmail, createFirst, createLast, loadRows],
  );

  const toggleUserAccount = useCallback(
    async (user: AdminUserRow) => {
      if (user.account_status === 'pending_invite') return;
      const next =
        user.account_status === 'active' ? 'suspended' : 'active';
      try {
        await apiRequest(`/api/admin/users/${user.user_id}`, {
          method: 'PUT',
          body: JSON.stringify({ account_status: next }),
        });
        await loadRows();
      } catch (err) {
        console.error('Failed to toggle user account', err);
      }
    },
    [loadRows],
  );

  const sendPasswordReset = useCallback(
    async (user: AdminUserRow) => {
      try {
        await apiRequest(`/api/admin/users/${user.user_id}/password-reset`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('Failed to send password reset', err);
      }
    },
    [],
  );

  return {
    userRows,
    loading,
    createFirst,
    setCreateFirst,
    createLast,
    setCreateLast,
    createEmail,
    setCreateEmail,
    creating,
    loadRows,
    openCreateModal,
    handleCreateSubmit,
    accountStatusLabel,
    userTypeLabel,
    userStatusBadgeClass,
    userTypeBadgeClass,
    userStatusActionLabel,
    formatUserDisplayName,
    toggleUserAccount,
    sendPasswordReset,
  };
}
