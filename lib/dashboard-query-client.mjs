import { QueryClient } from '@tanstack/react-query';

export const DASHBOARD_QUERY_KEY = ['dashboard'];
export const DASHBOARD_DATA_CHANGED = 'ecopin-dashboard-data-changed';

export function dashboardSessionScope(session) {
  return JSON.stringify([session?.sessionTag, session?.user?.id, session?.user?.role,
    session?.user?.lgu_id, session?.user?.barangay_id]);
}

export function createDashboardQueryClient() {
  return new QueryClient({ defaultOptions: { queries: {
    staleTime: 30_000, gcTime: 5 * 60_000, retry: false,
  } } });
}
