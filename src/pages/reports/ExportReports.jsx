import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { getErrorMessage } from '../../lib/api';
import { downloadReport, fetchReportMeta } from '../../lib/reportApi';
import { queryKeys } from '../../lib/queries';
import { useReportFilters } from '../../hooks/useReportFilters';
import { PageShell } from '../../components/PageShell';
import { ReportFilters } from '../../components/reports/ReportFilters';

const EXPORTS = [
  { id: 'messages', label: 'Message Reports', path: '/api/reports/messages/export', file: 'message-report' },
  { id: 'campaigns', label: 'Campaign Reports', path: '/api/reports/campaigns/export', file: 'campaign-report' },
  { id: 'failed', label: 'Failed Messages', path: '/api/reports/failed/export', file: 'failed-messages' },
  { id: 'usage', label: 'Usage / Cost', path: '/api/reports/usage/export', file: 'usage-report' },
];

export default function ExportReports() {
  const { applied, draft, setDraft, apply, reset } = useReportFilters();
  const [format, setFormat] = useState('xlsx');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const metaQuery = useQuery({
    queryKey: queryKeys.reportsMeta,
    queryFn: fetchReportMeta,
    staleTime: 5 * 60_000,
  });

  async function runExport(item) {
    setError('');
    setMessage('');
    setBusy(item.id);
    try {
      await downloadReport(item.path, { ...applied, format }, `${item.file}.${format}`);
      setMessage(`${item.label} exported.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  }

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Reports', to: '/reports' }, { label: 'Export' }]}
      title="Export Reports"
    >
      <p className="-mt-3 text-sm text-[var(--muted)]">
        Exports run on the server and include only the records matching the filters below.
      </p>
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        meta={metaQuery.data}
        showTemplate
        showCampaignStatus
        onApply={() => apply()}
        onReset={reset}
      />

      <div className="card p-4">
        <div className="mb-4 text-xs font-bold uppercase tracking-wide text-[var(--faint)]">Format</div>
        <div className="flex gap-2">
          {['csv', 'xlsx'].map((item) => (
            <button
              key={item}
              type="button"
              className={`btn ${format === item ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormat(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EXPORTS.map((item) => (
          <div key={item.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-extrabold">{item.label}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Filtered {format.toUpperCase()} download</div>
            </div>
            <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => runExport(item)}>
              <Download size={16} /> {busy === item.id ? 'Exporting…' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
