import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api';
import { PageLoader, StatCard } from '../components/ui';
import { PageShell } from '../components/PageShell';

function AnalyticsChart({ points }) {
  const w = 640;
  const h = 240;
  const pad = 28;
  const max = Math.max(1, ...points.flatMap((p) => [p.sent, p.delivered, p.read, p.failed]));

  function line(key, color) {
    const coords = points
      .map((p, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
        const y = h - pad - (p[key] / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
    return (
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        points={coords}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-64 w-full">
      {[0, 1, 2, 3].map((i) => {
        const y = pad + i * ((h - pad * 2) / 3);
        return <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#eef2f7" />;
      })}
      {line('sent', '#3b82f6')}
      {line('delivered', '#25d366')}
      {line('read', '#f59e0b')}
      {line('failed', '#ef4444')}
      {points.map((p, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
        return (
          <text key={p.label} x={x} y={h - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function ReportsPage() {
  const { data, isPending, error: queryError } = useQuery({
    queryKey: ['reports-messages'],
    queryFn: async () => {
      const { data: res } = await api.get('/api/reports/messages');
      return res.data;
    },
  });
  const summary = data?.summary || null;
  const daily = data?.daily || [];
  const loading = isPending && !data;
  const error = queryError ? getErrorMessage(queryError) : '';

  const points = useMemo(() => {
    const rows = daily.slice(-7);
    if (!rows.length) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({
        label,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      }));
    }
    return rows.map((r) => ({
      label: String(r.day).slice(5, 10),
      sent: Number(r.sent || 0),
      delivered: Number(r.delivered || 0),
      read: Number(r.read || 0),
      failed: Number(r.failed || 0),
    }));
  }, [daily]);

  const hasActivity =
    summary &&
    [summary.sent, summary.delivered, summary.read, summary.failed, summary.pending].some(
      (n) => Number(n || 0) > 0
    );

  return (
    <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports' }]}>
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden">
        {loading ? (
          <PageLoader className="flex-1 min-h-[calc(100vh-11.5rem)]" size="lg" />
        ) : !summary || !hasActivity ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
              <BarChart3 size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
            </div>
            <div className="text-base font-extrabold text-slate-900">No report data yet.</div>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Messaging trends will appear here after you send campaigns.
            </p>
          </div>
        ) : (
          <div className="my-auto w-full space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Sent" value={summary.sent} />
              <StatCard label="Delivered" value={summary.delivered} />
              <StatCard label="Read" value={summary.read} />
              <StatCard label="Failed" value={summary.failed} />
              <StatCard label="Pending" value={summary.pending} />
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-white p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="font-extrabold text-slate-900">Messaging Trends</div>
                <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-blue-500" /> Sent
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-[var(--wa)]" /> Delivered
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-amber-500" /> Read
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-red-500" /> Failed
                  </span>
                </div>
              </div>
              <AnalyticsChart points={points} />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
