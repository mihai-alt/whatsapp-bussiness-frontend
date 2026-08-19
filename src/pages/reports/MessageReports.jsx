import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchReportList, fetchReportMeta } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useReportFilters } from '../../hooks/useReportFilters';
import { useWorkspaceRealtime } from '../../hooks/useWorkspaceRealtime';
import { PageShell } from '../../components/PageShell';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { MessageReportTable } from '../../components/reports/MessageReportTable';

export default function MessageReports() {
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
    queryKey: queryKeys.reportsMessages(applied),
    queryFn: () => fetchReportList('/api/reports/messages', applied),
  });

  useWorkspaceRealtime(['campaigns'], () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'messages'] });
  });

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
    <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports', to: '/reports' }, { label: 'Messages' }]} title="Message Reports">
      {exportError ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</div> : null}
      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        meta={metaQuery.data}
        onApply={() => apply({ search: draft.search })}
        onReset={reset}
        onExport={handleExport}
        exporting={exporting}
      />
      <MessageReportTable
        rows={listQuery.data?.rows}
        loading={listQuery.isPending && !listQuery.data}
        error={listQuery.error}
        onRetry={() => listQuery.refetch()}
        pagination={listQuery.data?.pagination}
        onPage={(page) => setPage(page)}
        onLimit={(limit) => setPage(1, limit)}
        search={draft.search}
        onSearch={(search) => setDraft((d) => ({ ...d, search }))}
        onSearchSubmit={() => apply({ search: draft.search })}
      />
    </PageShell>
  );
}
