// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { closeModalFromForm } from '../utils/modal';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const BADGE_CONNECTED_STYLE =
  'font-size:11px;background:rgba(16,185,129,.12);color:rgb(22,101,52);border:1px solid rgba(16,185,129,.35);';
const BADGE_DISCONNECTED_STYLE =
  'font-size:11px;background:rgba(249,202,98,.14);color:rgb(180,130,20);border:1px solid rgba(249,202,98,.3);';

/** Time to show “Connection saved.” before closing the modal (same pattern as admin modals). */
const OCI_MODAL_AUTO_CLOSE_MS = 1800;

export type OciConnectionSummary = {
  connection_id: string;
  user: string;
  tenancy: string;
  fingerprint: string;
  /** ISO 8601 from API, or null for legacy rows */
  created_on: string | null;
};

function formatOciCreatedOn(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem('cloudey_access_token');
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} -> ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type');
  if (!ct?.includes('application/json')) return null;
  return res.json();
}

function normalizeConnection(raw: Record<string, unknown> | null | undefined): OciConnectionSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.connection_id;
  const user = raw.user;
  const tenancy = raw.tenancy;
  const fingerprint = raw.fingerprint;
  if (typeof id !== 'string' || typeof user !== 'string' || typeof tenancy !== 'string' || typeof fingerprint !== 'string') {
    return null;
  }
  const co = raw.created_on;
  let created_on: string | null = null;
  if (typeof co === 'string') created_on = co;
  else if (co != null) created_on = String(co);
  return { connection_id: id, user, tenancy, fingerprint, created_on };
}

function applyOciConnectionCard(conn: OciConnectionSummary | null) {
  const badge = document.getElementById('ociConnBadge');
  const ociRow = document.getElementById('ociConnRow');
  const ociChevron = document.getElementById('ociChevron');
  const ociDeleteBtn = document.getElementById('ociDeleteBtn');
  const ociConfigBtn = document.getElementById('ociConfigureBtn');
  const ociPanel = document.getElementById('ociCredPanel');

  if (conn && badge && ociRow && ociChevron && ociDeleteBtn && ociConfigBtn) {
    badge.textContent = 'Connected';
    badge.className = 'badge fw-semibold rounded-pill';
    badge.style.cssText = BADGE_CONNECTED_STYLE;
    ociChevron.classList.remove('d-none');
    ociDeleteBtn.classList.remove('d-none');
    ociConfigBtn.classList.add('d-none');
    ociRow.style.cursor = 'pointer';
    if (ociPanel) ociPanel.classList.add('d-none');
    ociChevron.style.transform = 'rotate(0deg)';
    return;
  }

  if (badge) {
    badge.textContent = 'Not Configured';
    badge.className = 'badge fw-semibold rounded-pill';
    badge.style.cssText = BADGE_DISCONNECTED_STYLE;
  }
  ociChevron?.classList.add('d-none');
  ociDeleteBtn?.classList.add('d-none');
  ociConfigBtn?.classList.remove('d-none');
  if (ociRow) ociRow.style.cursor = 'default';
  if (ociPanel) ociPanel.classList.add('d-none');
  if (ociChevron) ociChevron.style.transform = 'rotate(0deg)';
}

/**
 * Customer Settings — OCI card + API key modal.
 * Vite does not load BSS `cloudey.js`; this hook loads connection state from the API and
 * syncs the OCI card chrome in the DOM (`#ociConnRow`, badge, chevron, delete/configure). Credential
 * lines inside `#ociCredPanel` are driven from BSS via `data-cloudey` → `cloudey.config.json` (`ociSaved*`).
 */
export function useCustomerSettings() {
  const { activeCompany } = useAuth();
  const [userOcid, setUserOcid] = useState('');
  const [tenancyOcid, setTenancyOcid] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [pemContent, setPemContent] = useState('');
  const [ociConnectionMessage, setOciConnectionMessage] = useState('');
  const [ociConnection, setOciConnection] = useState<OciConnectionSummary | null>(null);
  const ociConnectionRef = useRef<OciConnectionSummary | null>(null);
  ociConnectionRef.current = ociConnection;

  const ociSavedUser = useMemo(() => ociConnection?.user ?? '', [ociConnection]);
  const ociSavedTenancy = useMemo(() => ociConnection?.tenancy ?? '', [ociConnection]);
  const ociSavedFingerprint = useMemo(() => ociConnection?.fingerprint ?? '', [ociConnection]);
  const ociSavedCreatedDisplay = useMemo(
    () => formatOciCreatedOn(ociConnection?.created_on ?? null),
    [ociConnection],
  );

  const refreshOciConnection = useCallback(async () => {
    const cid = activeCompany?.company_id;
    if (!cid) {
      setOciConnection(null);
      return;
    }
    try {
      const rows = await apiRequest(`/api/v1/oci/connections/?company_id=${encodeURIComponent(cid)}`);
      if (!Array.isArray(rows) || rows.length === 0) {
        setOciConnection(null);
        return;
      }
      const first = normalizeConnection(rows[0] as Record<string, unknown>);
      setOciConnection(first);
    } catch (e) {
      console.warn('OCI connections list failed', e);
      setOciConnection(null);
    }
  }, [activeCompany?.company_id]);

  useEffect(() => {
    void refreshOciConnection();
  }, [refreshOciConnection]);

  useEffect(() => {
    applyOciConnectionCard(ociConnection);
  }, [ociConnection]);

  const resetOciKeyUi = useCallback(() => {
    setPemContent('');
    const dropZone = document.getElementById('ociDropZone');
    const fileInput = dropZone?.querySelector('input[type="file"]') as HTMLInputElement | null;
    const fileState = document.getElementById('ociFileState');
    const fileName = document.getElementById('ociFileName');
    const fileChars = document.getElementById('ociFileChars');
    if (dropZone) dropZone.classList.remove('d-none');
    if (fileState) {
      fileState.classList.add('d-none');
      fileState.classList.remove('d-flex');
    }
    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = '';
    if (fileChars) fileChars.textContent = 'Text';
  }, []);

  useEffect(() => {
    const dropZone = document.getElementById('ociDropZone');
    const fileInput = dropZone?.querySelector('input[type="file"]') as HTMLInputElement | null;
    const fileState = document.getElementById('ociFileState');
    const fileName = document.getElementById('ociFileName');
    const fileChars = document.getElementById('ociFileChars');
    const clearBtn = document.getElementById('ociClearKey');

    const setFileUi = (name: string, content: string) => {
      setPemContent(content);
      if (fileName) fileName.textContent = name;
      if (fileChars) fileChars.textContent = `${content.length.toLocaleString()} chars · ready`;
      if (dropZone) dropZone.classList.add('d-none');
      if (fileState) {
        fileState.classList.remove('d-none');
        fileState.classList.add('d-flex');
      }
    };

    if (!fileInput || !dropZone) return undefined;

    const onFileChange = () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (e) => setFileUi(f.name, String(e.target?.result ?? ''));
      r.readAsText(f);
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      dropZone.classList.add('border-primary');
    };
    const onDragLeave = () => dropZone.classList.remove('border-primary');
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dropZone.classList.remove('border-primary');
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => setFileUi(f.name, String(ev.target?.result ?? ''));
      r.readAsText(f);
    };

    fileInput.addEventListener('change', onFileChange);
    dropZone.addEventListener('dragover', onDragOver);
    dropZone.addEventListener('dragleave', onDragLeave);
    dropZone.addEventListener('drop', onDrop);
    clearBtn?.addEventListener('click', resetOciKeyUi);

    return () => {
      fileInput.removeEventListener('change', onFileChange);
      dropZone.removeEventListener('dragover', onDragOver);
      dropZone.removeEventListener('dragleave', onDragLeave);
      dropZone.removeEventListener('drop', onDrop);
      clearBtn?.removeEventListener('click', resetOciKeyUi);
    };
  }, [resetOciKeyUi]);

  useEffect(() => {
    const row = document.getElementById('ociConnRow');
    const panel = document.getElementById('ociCredPanel');
    const chevron = document.getElementById('ociChevron');
    if (!row || !panel) return undefined;

    const onRowClick = (e: MouseEvent) => {
      if (!ociConnectionRef.current) return;
      const t = e.target as HTMLElement;
      if (t.closest('#ociDeleteBtn') || t.closest('#ociConfigureBtn')) return;
      const isOpen = !panel.classList.contains('d-none');
      panel.classList.toggle('d-none');
      if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    };

    row.addEventListener('click', onRowClick);
    return () => row.removeEventListener('click', onRowClick);
  }, []);

  useEffect(() => {
    const btn = document.getElementById('ociDeleteBtn');
    if (!btn) return undefined;

    const onDelete = async () => {
      const conn = ociConnectionRef.current;
      if (!conn) return;
      if (!window.confirm('Delete this connection? Cloudey will stop syncing your billing data.')) return;
      try {
        await apiRequest(`/api/v1/oci/connections/${encodeURIComponent(conn.connection_id)}`, { method: 'DELETE' });
        setOciConnection(null);
      } catch (err) {
        console.error('OCI connection delete failed', err);
        window.alert('Could not delete the connection. Try again.');
      }
    };

    btn.addEventListener('click', onDelete);
    return () => btn.removeEventListener('click', onDelete);
  }, [ociConnection]);

  const handleOCIConnectionSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const formEl = e.currentTarget as HTMLFormElement;
      setOciConnectionMessage('');
      if (!activeCompany?.company_id) {
        setOciConnectionMessage('Select a company before saving an OCI connection.');
        return;
      }
      const keyContent = pemContent.trim();
      if (!userOcid.trim() || !tenancyOcid.trim() || !fingerprint.trim() || !keyContent) {
        setOciConnectionMessage('Fill in all fields and upload your private key (.pem).');
        return;
      }
      try {
        const created = await apiRequest('/api/v1/oci/connections/', {
          method: 'POST',
          body: JSON.stringify({
            company_id: activeCompany.company_id,
            user: userOcid.trim(),
            tenancy: tenancyOcid.trim(),
            fingerprint: fingerprint.trim(),
            key_content: keyContent,
            passphrase: null,
          }),
        });
        setOciConnectionMessage('Connection saved.');
        setUserOcid('');
        setTenancyOcid('');
        setFingerprint('');
        resetOciKeyUi();
        const next = normalizeConnection(created as Record<string, unknown>);
        if (next) setOciConnection(next);
        else await refreshOciConnection();

        const modalEl = formEl.closest('.modal') as HTMLElement | null;
        const onHidden = () => {
          setOciConnectionMessage('');
          modalEl?.removeEventListener('hidden.bs.modal', onHidden);
        };
        if (modalEl) modalEl.addEventListener('hidden.bs.modal', onHidden);

        window.setTimeout(() => closeModalFromForm(formEl), OCI_MODAL_AUTO_CLOSE_MS);
      } catch (err) {
        console.error('OCI connection save failed', err);
        setOciConnectionMessage('Could not save connection. Check your credentials and try again.');
      }
    },
    [activeCompany, userOcid, tenancyOcid, fingerprint, pemContent, resetOciKeyUi, refreshOciConnection],
  );

  return {
    userOcid,
    setUserOcid,
    tenancyOcid,
    setTenancyOcid,
    fingerprint,
    setFingerprint,
    ociSavedUser,
    ociSavedTenancy,
    ociSavedFingerprint,
    ociSavedCreatedDisplay,
    ociConnectionMessage,
    handleOCIConnectionSubmit,
  };
}
