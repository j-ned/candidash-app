/** Vue du dashboard retenue entre deux visites (préférence locale au navigateur). */
export type DashboardView = 'list' | 'board';

export const VIEW_STORAGE_KEY = 'dashboard-view';

/** `storage` absent (SSR) ou qui lève (navigation privée, stockage bloqué) : vue liste. */
export function readViewPreference(storage: Storage | undefined): DashboardView {
  try {
    return storage?.getItem(VIEW_STORAGE_KEY) === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

export function writeViewPreference(storage: Storage | undefined, view: DashboardView): void {
  try {
    storage?.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Stockage indisponible (mode privé, quota) : la préférence ne survit pas, sans gravité.
  }
}
