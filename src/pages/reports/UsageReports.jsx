import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchReportMeta, fetchUsageReport } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useReportFilters } from '../../hooks/useReportFilters';
import { useWorkspaceRealtime } from '../../hooks/useWorkspaceRealtime';
import { PageShell } from '../../components/PageShell';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { ReportKpiCard } from '../../components/reports/ReportKpiCard';
import { formatCount, formatInr, formatReportDate } from '../../components/reports/reportUtils';

export default function UsageReports() {
  const queryClient = useQueryClient();
  const { applied, draft, setDraft, apply, reset } = useReportFilters();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const metaQuery = useQuery({
    queryKey: queryKeys.reportsMeta,
    queryFn: fetchReportMeta,
    staleTime: 5 * 60_000,
  });
  const usageQuery = useQuery({
    queryKey: queryKeys.reportsUsage(applied),
    queryFn: () => fetchUsageReport(applied),
  });

  useWorkspaceRealtime(['campaigns', 'wallet'], () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'usage'] });
  });

  const totals = usageQuery.data?.totals || {};
  const wallet = usageQuery.data?.wallet || {};
  const daily = usageQuery.data?.daily || [];
  const maxCost = Math.max(1, ...daily.map((d) => Number(d.cost || 0)));

  async function handleExport() {
    setExportError('');
    setExporting(true);
    try {
      await downloadReport('/api/reports/usage/export', { ...applied, format: 'xlsx' }, 'usage-report.xlsx');
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports', to: '/reports' }, { label: 'Usage' }]}
      title="Usage / Cost Reports"
    >
      {exportError ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div> : null}
      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        meta={metaQuery.data}
        showStatus={false}
        onApply={() => apply()}
        onReset={reset}
        onExport={handleExport}
        exporting={exporting}
      />

      {usageQuery.error ? (
        <div className="card p-8 text-center text-sm text-[var(--muted)]">
          Unable to load report data. Please try again.
          <button type="button" className="btn btn-secondary mt-3" onClick={() => usageQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {usageQuery.isPending && !usageQuery.data ? (
              Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--panel-2)]" />)
            ) : (
              <>
                <ReportKpiCard label="Total Messages" value={totals.messages || 0} />
                <ReportKpiCard label="Total Cost" value={formatInr(totals.cost)} />
                <ReportKpiCard label="Today's Cost" value={formatInr(totals.today_cost)} />
                <ReportKpiCard label="This Week" value={formatInr(totals.week_cost)} />
                <ReportKpiCard label="This Month" value={formatInr(totals.month_cost)} />
                <ReportKpiCard label="Avg Cost / Message" value={formatInr(totals.avg_cost)} />
              </>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
            <div className="card p-4 sm:p-5">
              <div className="mb-4 font-extrabold">Daily Usage</div>
              {usageQuery.isPending && !usageQuery.data ? (
                <div className="h-48 animate-pulse rounded-xl bg-[var(--panel-2)]" />
              ) : !daily.length ? (
                <div className="grid h-48 place-items-center text-sm text-[var(--muted)]">No data found for the selected filters.</div>
              ) : (
                <svg viewBox="0 0 640 200" className="h-48 w-full">
                  {daily.map((row, i) => {
                    const barW = Math.max(8, (640 - 40) / daily.length - 8);
                    const x = 20 + i * ((640 - 40) / daily.length);
                    const h = (Number(row.cost || 0) / maxCost) * 150;
                    return (
                      <g key={row.date || i}>
                        <rect x={x} y={170 - h} width={barW} height={h} rx="4" fill="#25d366" />
                        <text x={x + barW / 2} y="190" textAnchor="middle" fontSize="9" fill="var(--faint)">
                          {String(row.date || '').slice(5, 10)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <div className="card p-4">
              <div className="font-extrabold">Wallet</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Current Balance</span>
                  <span className="font-bold">{formatInr(wallet.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Total Spent</span>
                  <span className="font-bold">{formatInr(wallet.spent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Remaining Balance</span>
                  <span className="font-bold">{formatInr(wallet.remaining)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3 font-extrabold">Daily Cost</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-2)] text-left text-[var(--faint)]">
                  <tr>
                    {['Date', 'Messages', 'Sent', 'Delivered', 'Failed', 'Cost'].map((h) => (
                      <th key={h} className="px-4 py-3 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daily.length ? (
                    daily.map((row) => (
                      <tr key={row.date} className="border-t border-[var(--line)]">
                        <td className="px-4 py-3">{formatDay(row.date)}</td>
                        <td className="px-4 py-3">{formatCount(row.messages)}</td>
                        <td className="px-4 py-3">{formatCount(row.sent)}</td>
                        <td className="px-4 py-3">{formatCount(row.delivered)}</td>
                        <td className="px-4 py-3">{formatCount(row.failed)}</td>
                        <td className="px-4 py-3">{formatInr(row.cost)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">
                        No data found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}

function formatDay(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  return formatReportDate(`${raw}T00:00:00+05:30`);
}
