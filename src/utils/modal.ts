import { Modal } from 'bootstrap';

/**
 * Close the Bootstrap 5 modal that wraps this form.
 *
 * Uses the ESM `Modal` API — `import 'bootstrap/dist/js/bootstrap.bundle.min.js'` in `main.tsx`
 * does **not** set `window.bootstrap`, so `window.bootstrap.Modal` is unreliable in Vite.
 */
export function closeModalFromForm(form: HTMLFormElement | null) {
  const modalEl = form?.closest('.modal') as HTMLElement | null;
  if (!modalEl) return;

  const inst = Modal.getInstance(modalEl) ?? Modal.getOrCreateInstance(modalEl);
  inst.hide();
}

/** Close a modal by its root element id (e.g. `#createNewOCIConnection` without the hash). */
export function hideModalByElementId(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const inst = Modal.getInstance(el) ?? Modal.getOrCreateInstance(el);
  inst.hide();
}
