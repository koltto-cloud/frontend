// @ts-nocheck
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { closeModalFromForm } from '../utils/modal';

export type AdminMembershipRow = {
  user_id: string;
  company_id: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string;
  company_name: string;
  role: string;
  active: boolean;
};

export const MEMBERSHIP_ROLE_OPTIONS = ['Owner', 'Admin', 'Member'] as const;

export function membershipUserName(row: AdminMembershipRow): string {
  const value = [row.user_first_name, row.user_last_name].filter(Boolean).join(' ').trim();
  return value || '—';
}

export function membershipStatusLabel(active: boolean): string {
  return active ? 'Active' : 'Inactive';
}

export function membershipToggleLabel(row: AdminMembershipRow): string {
  return row.active ? 'Suspend' : 'Reactivate';
}

export function membershipRoleBadgeClass(role: string): string {
  if (role === 'Owner') return 'badge fw-semibold rounded-pill text-warning bg-warning bg-opacity-25';
  if (role === 'Admin') return 'badge fw-semibold rounded-pill text-primary bg-primary bg-opacity-10';
  if (role === 'Member') return 'badge fw-semibold rounded-pill text-secondary bg-secondary bg-opacity-10';
  return 'badge fw-semibold rounded-pill text-secondary bg-secondary bg-opacity-10';
}

export function membershipStatusBadgeClass(active: boolean): string {
  if (active) return 'badge fw-semibold rounded-pill text-success bg-success bg-opacity-10';
  return 'badge fw-semibold rounded-pill text-warning bg-warning bg-opacity-25';
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

export function useAdminMemberships() {
  const [membershipRows, setMembershipRows] = useState<AdminMembershipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createUserIds, setCreateUserIds] = useState<string[]>([]);
  const [createCompanyId, setCreateCompanyId] = useState('');
  const [createRole, setCreateRole] = useState<string>(MEMBERSHIP_ROLE_OPTIONS[1]);
  const [creating, setCreating] = useState(false);

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>(MEMBERSHIP_ROLE_OPTIONS[1]);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [saving, setSaving] = useState(false);

  const [userOptions, setUserOptions] = useState<Array<{ user_id: string; email: string }>>([]);
  const [companyOptions, setCompanyOptions] = useState<Array<{ company_id: string; name: string }>>([]);
  const [userQuery, setUserQuery] = useState('');
  const [companyQuery, setCompanyQuery] = useState('');

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiRequest('/api/admin/memberships/table');
      setMembershipRows(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('Failed to load memberships table', err);
      setMembershipRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const [users, companies] = await Promise.all([
        apiRequest('/api/admin/users/table'),
        apiRequest('/api/admin/companies/table'),
      ]);
      setUserOptions(
        (Array.isArray(users) ? users : []).map((u: any) => ({
          user_id: String(u.user_id),
          email: String(u.email),
        })),
      );
      setCompanyOptions(
        (Array.isArray(companies) ? companies : []).map((c: any) => ({
          company_id: String(c.company_id),
          name: String(c.name),
        })),
      );
    } catch (err) {
      console.error('Failed to load membership options', err);
      setUserOptions([]);
      setCompanyOptions([]);
    }
  }, []);

  useEffect(() => {
    void loadRows();
    void loadOptions();
  }, [loadRows, loadOptions]);

  const openCreateModal = useCallback(() => {
    setCreateUserIds([]);
    setCreateCompanyId('');
    setCreateRole(MEMBERSHIP_ROLE_OPTIONS[1]);
    setUserQuery('');
    setCompanyQuery('');
    // TODO [cloudey]: show modal #adminMembershipCreateModal
  }, []);

  const openEditModal = useCallback((row: AdminMembershipRow) => {
    setEditUserId(row.user_id);
    setEditCompanyId(row.company_id);
    setEditRole(row.role);
    setEditUserName(membershipUserName(row));
    setEditUserEmail(row.user_email);
    setEditCompanyName(row.company_name);
    // TODO [cloudey]: show modal #adminMembershipEditModal
  }, []);

  const handleCreateSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const formEl = e.currentTarget as HTMLFormElement;
    if (!createCompanyId || createUserIds.length === 0) return;
    setCreating(true);
    try {
      const results = await Promise.allSettled(
        createUserIds.map((userId) =>
          apiRequest('/api/admin/memberships/', {
            method: 'POST',
            body: JSON.stringify({
              user_id: userId,
              company_id: createCompanyId,
              role: createRole,
            }),
          }),
        ),
      );
      const failedCount = results.filter((r) => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`Some memberships were not created (${failedCount}/${createUserIds.length}).`);
      }
      await loadRows();
      closeModalFromForm(formEl);
    } catch (err) {
      console.error('Failed to create membership', err);
    } finally {
      setCreating(false);
    }
  }, [createCompanyId, createRole, createUserIds, loadRows]);

  const handleEditSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const formEl = e.currentTarget as HTMLFormElement;
    if (!editUserId || !editCompanyId) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/memberships/${editUserId}/${editCompanyId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: editRole }),
      });
      await loadRows();
      closeModalFromForm(formEl);
    } catch (err) {
      console.error('Failed to update membership', err);
    } finally {
      setSaving(false);
    }
  }, [editCompanyId, editRole, editUserId, loadRows]);

  const toggleMembershipStatus = useCallback(async (row: AdminMembershipRow) => {
    const next = !row.active;
    try {
      await apiRequest(`/api/admin/memberships/${row.user_id}/${row.company_id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: next }),
      });
      await loadRows();
    } catch (err) {
      console.error('Failed to toggle membership status', err);
    }
  }, [loadRows]);

  const deleteMembership = useCallback(async (row: AdminMembershipRow) => {
    try {
      await apiRequest(`/api/admin/memberships/${row.user_id}/${row.company_id}`, {
        method: 'DELETE',
      });
      await loadRows();
    } catch (err) {
      console.error('Failed to delete membership', err);
    }
  }, [loadRows]);

  const filteredUserOptions = userOptions.filter((u) =>
    u.email.toLowerCase().includes(userQuery.toLowerCase()),
  );
  const filteredCompanyOptions = companyOptions.filter((c) =>
    c.name.toLowerCase().includes(companyQuery.toLowerCase()),
  );

  return {
    membershipRows,
    loading,
    createUserIds,
    setCreateUserIds,
    createCompanyId,
    setCreateCompanyId,
    createRole,
    setCreateRole,
    creating,
    editUserId,
    editCompanyId,
    editRole,
    editUserName,
    editUserEmail,
    editCompanyName,
    setEditRole,
    saving,
    userQuery,
    setUserQuery,
    companyQuery,
    setCompanyQuery,
    filteredUserOptions,
    filteredCompanyOptions,
    loadRows,
    openCreateModal,
    openEditModal,
    handleCreateSubmit,
    handleEditSubmit,
    toggleMembershipStatus,
    deleteMembership,
    membershipUserName,
    membershipStatusLabel,
    membershipToggleLabel,
    membershipRoleBadgeClass,
    membershipStatusBadgeClass,
  };
}
