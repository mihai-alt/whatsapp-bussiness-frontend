import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchReportList, fetchReportMeta } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useReportFilters } from '../../hooks/useReportFilters';
import { useWorkspaceRealtime } from '../../hooks/useWorkspaceRealtime';
import { PageShell } from '../../components/PageShell';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { CampaignPerformanceTable } from '../../components/reports/CampaignPerformanceTable';

export default function CampaignReports() {
  const queryClient = useQueryClient();
  const { applied, draft, setDraft, apply, reset, setPage } = useReportFilters();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const metaQuery = useQuery({
    queryKey: queryKeys.reportsMeta,
    queryFn: fetchReportMeta,
    staleTime: 5 * 60_000,
  });
  const listQuery = useQuery({
    queryKey: queryKeys.reportsCampaigns(applied),
    queryFn: () => fetchReportList('/api/reports/campaigns', applied),
  });

  useWorkspaceRealtime(['campaigns'], () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'campaigns'] });
  });

  async function handleExport() {
    setExportError('');
    setExporting(true);
    try {
      await downloadReport('/api/reports/campaigns/export', { ...applied, format: 'xlsx' }, 'campaign-report.xlsx');
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports', to: '/reports' }, { label: 'Campaigns' }]} title="Campaign Reports">
      {exportError ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div> : null}
      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        meta={metaQuery.data}
        showStatus={false}
        showCampaignStatus
        showTemplate
        extra={
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ search: draft.search });
            }}
          >
            <input
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              placeholder="Search campaign or template"
              value={draft.search}
              onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
            />
          </form>
        }
        onApply={() => apply({ search: draft.search })}
        onReset={reset}
        onExport={handleExport}
        exporting={exporting}
      />
      <CampaignPerformanceTable
        title="Campaign Reports"
        detailed
        rows={listQuery.data?.rows}
        loading={listQuery.isPending && !listQuery.data}
        error={listQuery.error}
        onRetry={() => listQuery.refetch()}
        pagination={listQuery.data?.pagination}
        onPage={(page) => setPage(page)}
        onLimit={(limit) => setPage(1, limit)}
      />
    </PageShell>
  );
}
