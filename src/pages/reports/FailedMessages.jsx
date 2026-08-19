import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchReportList, fetchReportMeta, retryFailedMessages } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useReportFilters } from '../../hooks/useReportFilters';
import { useWorkspaceRealtime } from '../../hooks/useWorkspaceRealtime';
import { PageShell } from '../../components/PageShell';
import { ReportFilters } from '../../components/reports/ReportFilters';
import { FailedMessageTable } from '../../components/reports/MessageReportTable';

export default function FailedMessages() {
  const queryClient = useQueryClient();
  const { applied, draft, setDraft, apply, reset, setPage } = useReportFilters();
  const [selected, setSelected] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const metaQuery = useQuery({
    queryKey: queryKeys.reportsMeta,
    queryFn: fetchReportMeta,
    staleTime: 5 * 60_000,
  });
  const listQuery = useQuery({
    queryKey: queryKeys.reportsFailed(applied),
    queryFn: () => fetchReportList('/api/reports/failed', applied),
  });

  useWorkspaceRealtime(['campaigns'], () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  });

  const retryMutation = useMutation({
    mutationFn: retryFailedMessages,
    onSuccess: (data) => {
      setSelected(new Set());
      setMessage(`Retried ${data?.retried || 0} message(s). ${data?.skipped?.length ? `${data.skipped.length} skipped.` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const rows = listQuery.data?.rows || [];

  async function handleExport() {
    setError('');
    setExporting(true);
    try {
      await downloadReport('/api/reports/failed/export', { ...applied, format: 'xlsx' }, 'failed-messages.xlsx');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function retryOne(row) {
    setError('');
    setMessage('');
    setBusyId(row.id);
    try {
      await retryMutation.mutateAsync({ ids: [row.id] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports', to: '/reports' }, { label: 'Failed Messages' }]}
      title="Failed Messages"
      actions={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!selected.size || retryMutation.isPending}
            onClick={() => {
              setError('');
              setMessage('');
              retryMutation.mutate({ ids: [...selected] });
            }}
          >
            Retry Selected
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={retryMutation.isPending}
            onClick={() => {
              if (!window.confirm('Retry all eligible failed messages in the current filters? Messages already accepted by Meta will be skipped.')) return;
              setError('');
              setMessage('');
              retryMutation.mutate({ all: true, filters: applied });
            }}
          >
            Retry All Failed
          </button>
        </>
      }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        meta={metaQuery.data}
        showStatus={false}
        onApply={() => apply({ search: draft.search })}
        onReset={reset}
        onExport={handleExport}
        exporting={exporting}
      />

      <FailedMessageTable
        rows={rows}
        loading={listQuery.isPending && !listQuery.data}
        error={listQuery.error}
        onRetryLoad={() => listQuery.refetch()}
        pagination={listQuery.data?.pagination}
        onPage={(page) => setPage(page)}
        onLimit={(limit) => setPage(1, limit)}
        selected={selected}
        onToggle={(id) => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onToggleAll={() => {
          setSelected((prev) => {
            const ids = rows.map((r) => r.id);
            const allOn = ids.length > 0 && ids.every((id) => prev.has(id));
            return allOn ? new Set() : new Set(ids);
          });
        }}
        onRetryOne={retryOne}
        busyId={busyId}
        search={draft.search}
        onSearch={(search) => setDraft((d) => ({ ...d, search }))}
        onSearchSubmit={() => apply({ search: draft.search })}
      />
    </PageShell>
  );
}
