import { Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/PageShell';
import { EmptyState } from '../components/ui';

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: res } = await api.get('/api/audit-logs', { params: { page: 1, limit: 100 } });
      return res.data;
    },
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const rows = data?.rows || [];

  return (
    <PageShell
      breadcrumb={[
        { label: 'Home', to: '/' },
        { label: 'Audit Logs' },
      ]}
    >
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who connected numbers, credited wallet, launched or approved campaigns, and changed roles.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{getErrorMessage(error)}</div>
      ) : null}

      {isLoading ? (
        <div className="card p-10 text-center text-slate-500">Loading…</div>
      ) : !rows.length ? (
        <EmptyState title="No audit events yet" body="Actions will appear here as your team uses the platform." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">User</th>
                <th className="px-4 py-3 font-bold">Action</th>
                <th className="px-4 py-3 font-bold">Entity</th>
                <th className="px-4 py-3 font-bold">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatWhen(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.user_name || '—'}</div>
                    <div className="text-xs text-slate-500">{row.user_email || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{row.action}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.entity_type || '—'}
                    {row.entity_id != null ? ` #${row.entity_id}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{row.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
