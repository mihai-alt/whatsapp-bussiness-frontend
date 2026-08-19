import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchCampaignReport, fetchReportList } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useWorkspaceRealtime } from '../../hooks/useWorkspaceRealtime';
import { PageShell } from '../../components/PageShell';
import { ReportKpiCard } from '../../components/reports/ReportKpiCard';
import { MessageReportTable } from '../../components/reports/MessageReportTable';
import {
  campaignStatusClass,
  formatCampaignStatus,
  formatCount,
  formatInr,
  formatPct,
  formatReportDate,
} from '../../components/reports/reportUtils';

export default function CampaignDetails() {
  const { campaignId } = useParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const messageFilters = useMemo(
    () => ({
      campaignId,
      range: 'all',
      status,
      search: appliedSearch,
      page,
      limit,
    }),
    [campaignId, status, appliedSearch, page, limit]
  );

  const detailQuery = useQuery({
    queryKey: queryKeys.reportsCampaign(campaignId),
    queryFn: () => fetchCampaignReport(campaignId),
    enabled: Boolean(campaignId),
  });
  const listQuery = useQuery({
    queryKey: queryKeys.reportsMessages(messageFilters),
    queryFn: () => fetchReportList('/api/reports/messages', messageFilters),
    enabled: Boolean(campaignId),
  });

  useWorkspaceRealtime(['campaigns'], () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  });

  const campaign = detailQuery.data?.campaign;
  const error = detailQuery.error ? getErrorMessage(detailQuery.error) : '';

  async function handleExport() {
    setExportError('');
    setExporting(true);
    try {
      await downloadReport(
        '/api/reports/messages/export',
        { ...messageFilters, format: 'xlsx' },
        `campaign-${campaignId}-messages.xlsx`
      );
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell
      breadcrumb={[
        { label: 'Home', to: '/' },
        { label: 'Reports', to: '/reports' },
        { label: 'Campaigns', to: '/reports/campaigns' },
        { label: campaign?.name || 'Details' },
      ]}
      title={campaign?.name || 'Campaign Details'}
      actions={
        <>
          <Link to="/reports/campaigns" className="btn btn-secondary">
            Back
          </Link>
          <button type="button" className="btn btn-secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </>
      }
    >
      {exportError ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div> : null}
      {error ? (
        <div className="card p-8 text-center text-sm text-[var(--muted)]">
          Unable to load report data. Please try again.
          <button type="button" className="btn btn-secondary mt-3" onClick={() => detailQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : !campaign && detailQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--panel-2)]" />
          ))}
        </div>
      ) : campaign ? (
        <>
          <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className={`badge ${campaignStatusClass(campaign.status)}`}>{formatCampaignStatus(campaign.status)}</span>
            <span className="text-[var(--muted)]">Template: {campaign.template || '—'}</span>
            <span className="text-[var(--muted)]">Number: {campaign.phone_number || '—'}</span>
            <span className="text-[var(--muted)]">Created: {formatReportDate(campaign.created_at)}</span>
            <span className="text-[var(--muted)]">Completed: {formatReportDate(campaign.completed_at)}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ReportKpiCard label="Recipients" value={campaign.recipients} />
            <ReportKpiCard label="Sent" value={campaign.sent} />
            <ReportKpiCard label="Delivered" value={campaign.delivered} hint={`${formatPct(campaign.delivery_rate)} delivery rate`} />
            <ReportKpiCard label="Read" value={campaign.read} hint={`${formatPct(campaign.read_rate)} read rate`} />
            <ReportKpiCard label="Failed" value={campaign.failed} hint={`${formatPct(campaign.failure_rate)} failure rate`} />
            <ReportKpiCard label="Pending" value={campaign.pending} />
            <ReportKpiCard label="Total Cost" value={formatInr(campaign.total_cost)} />
          </div>

          <div className="card p-5">
            <div className="font-extrabold">Progress</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              {formatCount(campaign.processed)} / {formatCount(campaign.recipients)} · {formatPct(campaign.progress_pct)}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--panel-2)]">
              <div className="h-full rounded-full bg-[var(--wa)]" style={{ width: `${Math.min(100, Number(campaign.progress_pct || 0))}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
              <div>
                <div className="text-xs font-bold uppercase text-[var(--faint)]">Messages/Min</div>
                <div className="font-extrabold">{campaign.messages_per_minute || 0}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[var(--faint)]">Processing Time</div>
                <div className="font-extrabold">{formatDuration(campaign.processing_ms)}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[var(--faint)]">Start time</div>
                <div className="font-extrabold">{formatReportDate(campaign.started_at || campaign.created_at)}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-[var(--faint)]">End time</div>
                <div className="font-extrabold">{formatReportDate(campaign.completed_at)}</div>
              </div>
            </div>
          </div>

          <select
            className="w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>

          <MessageReportTable
            rows={listQuery.data?.rows}
            loading={listQuery.isPending && !listQuery.data}
            error={listQuery.error}
            onRetry={() => listQuery.refetch()}
            pagination={listQuery.data?.pagination}
            onPage={setPage}
            onLimit={(next) => {
              setLimit(next);
              setPage(1);
            }}
            search={search}
            onSearch={setSearch}
            onSearchSubmit={() => {
              setAppliedSearch(search);
              setPage(1);
            }}
          />
        </>
      ) : null}
    </PageShell>
  );
}

function formatDuration(ms) {
  const n = Number(ms || 0);
  if (!n) return '—';
  const mins = Math.floor(n / 60000);
  const secs = Math.round((n % 60000) / 1000);
  if (mins < 1) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
