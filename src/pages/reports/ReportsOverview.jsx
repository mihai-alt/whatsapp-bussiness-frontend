import { Link, useLocation } from 'react-router';
import { CheckCheck, Clock3, Eye, Send, Wallet, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchMessagePerformance, fetchReportMeta, fetchReportOverview } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useReportFilters } from '../../hooks/useReportFilters';
import { useWorkspaceRealtime } from '../../hooks/useWorkspaceRealtime';
import { PageShell } from '../../components/PageShell';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { KpiSkeleton, ReportKpiCard } from '../../components/reports/ReportKpiCard';
import { MessagePerformanceChart, StatusDistributionChart } from '../../components/reports/MessagePerformanceChart';
import { CampaignPerformanceTable } from '../../components/reports/CampaignPerformanceTable';
import { formatCount, formatInr, formatPct, formatReportDate } from '../../components/reports/reportUtils';
import { useState } from 'react';

export default function ReportsOverview() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { applied, draft, setDraft, apply, reset } = useReportFilters();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const metaQuery = useQuery({
    queryKey: queryKeys.reportsMeta,
    queryFn: fetchReportMeta,
    staleTime: 5 * 60_000,
  });
  const overviewQuery = useQuery({
    queryKey: queryKeys.reportsOverview(applied),
    queryFn: () => fetchReportOverview(applied),
  });
  const chartQuery = useQuery({
    queryKey: queryKeys.reportsPerformance(applied),
    queryFn: () => fetchMessagePerformance(applied),
  });

  useWorkspaceRealtime(['campaigns'], () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  });

  const kpis = overviewQuery.data?.kpis || {};
  const wallet = overviewQuery.data?.wallet || {};
  const overviewError = overviewQuery.error ? getErrorMessage(overviewQuery.error) : '';

  async function handleExport() {
    setExportError('');
    setExporting(true);
    try {
      await downloadReport('/api/reports/messages/export', { ...applied, format: 'xlsx' }, 'message-report.xlsx');
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports' }]}
    >
      <p className="-mt-3 text-sm text-[var(--muted)]">
        Monitor message performance, campaign activity, delivery statistics, failures, and usage.
      </p>

      {exportError ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div> : null}

      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        meta={metaQuery.data}
        onApply={() => apply()}
        onReset={reset}
        onExport={handleExport}
        exporting={exporting}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {overviewQuery.isPending && !overviewQuery.data ? (
          Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : overviewError ? (
          <div className="card col-span-full p-6 text-center text-sm text-[var(--muted)]">
            Unable to load report data. Please try again.
            <button type="button" className="btn btn-secondary mt-3" onClick={() => overviewQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <ReportKpiCard
              label="Total Sent"
              value={kpis.sent || 0}
              delta={kpis.sent_delta}
              accent="#3b82f6"
              icon={<Send size={16} />}
            />
            <ReportKpiCard
              label="Delivered"
              value={kpis.delivered || 0}
              hint={`${formatPct(kpis.delivery_rate)} delivery rate`}
              accent="#25d366"
              icon={<CheckCheck size={16} />}
            />
            <ReportKpiCard
              label="Read"
              value={kpis.read || 0}
              hint={`${formatPct(kpis.read_rate)} read rate`}
              accent="#86efac"
              icon={<Eye size={16} />}
            />
            <ReportKpiCard
              label="Failed"
              value={kpis.failed || 0}
              hint={`${formatPct(kpis.failure_rate)} failure rate`}
              accent="#ef4444"
              icon={<XCircle size={16} />}
            />
            <ReportKpiCard
              label="Pending"
              value={kpis.pending || 0}
              hint={`${formatPct(kpis.pending_rate)} pending`}
              accent="#f59e0b"
              icon={<Clock3 size={16} />}
            />
            <ReportKpiCard
              label="Total Cost"
              value={formatInr(kpis.total_cost)}
              hint="Total spent"
              accent="#8b5cf6"
              icon={<Wallet size={16} />}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <MessagePerformanceChart
          points={chartQuery.data?.data || []}
          groupBy={applied.groupBy || 'day'}
          onGroupBy={(groupBy) => apply({ groupBy })}
          loading={chartQuery.isPending && !chartQuery.data}
          error={chartQuery.error}
          onRetry={() => chartQuery.refetch()}
        />
        <StatusDistributionChart
          distribution={overviewQuery.data?.distribution}
          loading={overviewQuery.isPending && !overviewQuery.data}
          error={overviewQuery.error}
          onRetry={() => overviewQuery.refetch()}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <CampaignPerformanceTable
          rows={overviewQuery.data?.campaigns || []}
          loading={overviewQuery.isPending && !overviewQuery.data}
          error={overviewQuery.error}
          onRetry={() => overviewQuery.refetch()}
          viewAllTo={`/reports/campaigns${location.search}`}
        />
        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--faint)]">Total Messages</div>
            <div className="mt-2 text-2xl font-extrabold">{formatCount(kpis.total)}</div>
            <div className="mt-1 text-xs font-semibold text-[var(--muted)]">
              {kpis.sent_delta >= 0 ? '↑' : '↓'} {formatPct(Math.abs(kpis.sent_delta || 0))} vs previous period
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--faint)]">Total Cost</div>
            <div className="mt-2 text-2xl font-extrabold">{formatInr(kpis.total_cost)}</div>
            <div className="mt-1 text-xs font-semibold text-[var(--muted)]">Period spend</div>
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <div className="font-extrabold">Recent Failed Messages</div>
              <Link to={`/reports/failed${location.search}`} className="text-sm font-bold text-[var(--wa-deep)]">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--panel-2)] text-left text-[var(--faint)]">
                  <tr>
                    <th className="px-4 py-2 font-bold">Phone</th>
                    <th className="px-4 py-2 font-bold">Campaign</th>
                    <th className="px-4 py-2 font-bold">Reason</th>
                    <th className="px-4 py-2 font-bold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(overviewQuery.data?.failed || []).length ? (
                    overviewQuery.data.failed.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--line)]">
                        <td className="px-4 py-2 font-semibold">{row.phone}</td>
                        <td className="px-4 py-2">{row.campaign_name || '—'}</td>
                        <td className="px-4 py-2 max-w-[140px] truncate text-[var(--muted)]">{row.error_message || '—'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-[var(--muted)]">{formatReportDate(row.failed_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-[var(--muted)]">
                        No failed messages in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card p-4">
            <div className="font-extrabold">Wallet Usage</div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-[var(--muted)]">Total Spent</span>
              <span className="font-bold">{formatInr(wallet.spent)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-[var(--muted)]">Remaining Balance</span>
              <span className="font-bold">{formatInr(wallet.remaining)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
              <div className="h-full rounded-full bg-[var(--wa)]" style={{ width: `${Math.min(100, Number(wallet.used_pct || 0))}%` }} />
            </div>
            <div className="mt-2 text-xs font-semibold text-[var(--muted)]">{formatPct(wallet.used_pct)} used</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
