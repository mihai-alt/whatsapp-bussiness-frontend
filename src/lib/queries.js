import { api, unwrapApiData } from './api';
import { queryClient } from './queryClient';

export const queryKeys = {
  dashboard: ['dashboard'],
  campaigns: ['campaigns'],
  groups: ['contact-groups'],
  reports: ['reports-messages'],
  numbers: ['whatsapp-numbers'],
  templatesStats: ['templates-stats'],
  contacts: ['contacts'],
  users: ['auth-users'],
  auditLogs: ['audit-logs'],
  wallet: ['wallet'],
  adminWallet: ['admin-wallet'],
  adminTransactions: ['admin-wallet-transactions'],
  adminRecharges: ['admin-wallet-recharges'],
};

export async function fetchDashboard() {
  const data = unwrapApiData(await api.get('/api/dashboard'));
  return data && typeof data === 'object' ? data : {};
}

export async function fetchCampaigns() {
  const data = unwrapApiData(await api.get('/api/campaigns'));
  return Array.isArray(data) ? data : [];
}

export async function fetchGroups() {
  const data = unwrapApiData(await api.get('/api/contacts/groups/list'));
  return Array.isArray(data) ? data : [];
}

export async function fetchReports() {
  return unwrapApiData(await api.get('/api/reports/messages'));
}

const ROUTE_PREFETCH = {
  '/': [{ queryKey: queryKeys.dashboard, queryFn: fetchDashboard }],
  '/campaigns': [{ queryKey: queryKeys.campaigns, queryFn: fetchCampaigns }],
  '/groups': [{ queryKey: queryKeys.groups, queryFn: fetchGroups }],
  '/reports': [{ queryKey: queryKeys.reports, queryFn: fetchReports }],
  '/whatsapp': [
    {
      queryKey: queryKeys.numbers,
      queryFn: async () => unwrapApiData(await api.get('/api/numbers')),
    },
  ],
  '/profile': [
    {
      queryKey: queryKeys.numbers,
      queryFn: async () => unwrapApiData(await api.get('/api/numbers')),
    },
  ],
  '/templates': [
    {
      queryKey: queryKeys.templatesStats,
      queryFn: async () => unwrapApiData(await api.get('/api/templates/stats')),
    },
  ],
  '/contacts': [
    {
      queryKey: queryKeys.contacts,
      queryFn: async () => unwrapApiData(await api.get('/api/contacts')),
    },
  ],
  '/users': [
    {
      queryKey: queryKeys.users,
      queryFn: async () => unwrapApiData(await api.get('/api/auth/users')),
    },
  ],
  '/audit-logs': [
    {
      queryKey: queryKeys.auditLogs,
      queryFn: async () => unwrapApiData(await api.get('/api/audit-logs', { params: { page: 1, limit: 100 } })),
    },
  ],
  '/admin/wallet/transactions': [
    {
      queryKey: queryKeys.adminTransactions,
      queryFn: async () => unwrapApiData(await api.get('/api/admin/wallet/transactions')),
    },
  ],
  '/admin/wallet/recharges': [
    {
      queryKey: queryKeys.adminRecharges,
      queryFn: async () => unwrapApiData(await api.get('/api/admin/wallet/recharges')),
    },
  ],
};

export function prefetchRoute(to, isAdmin) {
  if (to === '/wallet') {
    const path = isAdmin ? '/api/admin/wallet' : '/api/wallet';
    const queryKey = isAdmin ? queryKeys.adminWallet : queryKeys.wallet;
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => unwrapApiData(await api.get(path)),
    }).catch(() => {});
    return;
  }
  const jobs = ROUTE_PREFETCH[to];
  if (!jobs) return;
  jobs.forEach((job) => {
    queryClient.prefetchQuery(job).catch(() => {});
  });
}
