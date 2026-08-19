import { Search } from 'lucide-react';
import { formatCount, formatInr, formatReportDate, messageStatusClass } from './reportUtils';
import { ReportPagination } from './CampaignPerformanceTable';

export function MessageReportTable({
  rows,
  loading,
  error,
  empty = 'No data found for the selected filters.',
  onRetry,
  pagination,
  onPage,
  onLimit,
  search,
  onSearch,
  onSearchSubmit,
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-extrabold text-[var(--ink)]">Message Reports</div>
        {onSearch ? (
          <form
            className="relative w-full sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] py-2 pl-9 pr-3 text-sm"
              placeholder="Search phone, campaign, error"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </form>
        ) : null}
      </div>
      {error ? (
        <div className="p-6 text-center text-sm text-[var(--muted)]">
          Unable to load report data. Please try again.
          <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-[var(--panel-2)] text-left text-[var(--faint)]">
              <tr>
                {['Phone Number', 'Campaign', 'Template', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Failed At', 'Error', 'Cost'].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--line)]">
                    <td colSpan={10} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-[var(--panel-2)]" />
                    </td>
                  </tr>
                ))
              ) : rows?.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)] hover:bg-[var(--hover)]">
                    <td className="px-4 py-3 font-semibold">{row.phone}</td>
                    <td className="px-4 py-3">{row.campaign_name || '—'}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.template_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${messageStatusClass(row.status)}`}>
                        {String(row.status || '').replace(/^./, (c) => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">{formatReportDate(row.sent_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">{formatReportDate(row.delivered_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">{formatReportDate(row.read_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">{formatReportDate(row.failed_at)}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate text-[var(--muted)]" title={row.error_message || ''}>
                      {row.error_message || '—'}
                    </td>
                    <td className="px-4 py-3">{formatInr(row.cost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[var(--muted)]">
                    {empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {pagination ? (
        <ReportPagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPage={onPage}
          onLimit={onLimit}
        />
      ) : null}
    </div>
  );
}

export function FailedMessageTable({
  rows,
  loading,
  error,
  onRetryLoad,
  pagination,
  onPage,
  onLimit,
  selected,
  onToggle,
  onToggleAll,
  onRetryOne,
  busyId,
  search,
  onSearch,
  onSearchSubmit,
}) {
  const allIds = (rows || []).map((r) => r.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected?.has(id));
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-extrabold text-[var(--ink)]">
          Failed Messages {pagination?.total != null ? `(${formatCount(pagination.total)})` : ''}
        </div>
        {onSearch ? (
          <form
            className="relative w-full sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] py-2 pl-9 pr-3 text-sm"
              placeholder="Search phone, campaign, reason"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </form>
        ) : null}
      </div>
      {error ? (
        <div className="p-6 text-center text-sm text-[var(--muted)]">
          Unable to load report data. Please try again.
          <button type="button" className="btn btn-secondary mt-3" onClick={onRetryLoad}>
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-[var(--panel-2)] text-left text-[var(--faint)]">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={allChecked} onChange={onToggleAll} />
                </th>
                {['Phone', 'Campaign', 'Template', 'Failure reason', 'Error code', 'Failed time', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--line)]">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-[var(--panel-2)]" />
                    </td>
                  </tr>
                ))
              ) : rows?.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)] hover:bg-[var(--hover)]">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected?.has(row.id)} onChange={() => onToggle(row.id)} />
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.phone}</td>
                    <td className="px-4 py-3">{row.campaign_name || '—'}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.template_name || '—'}</td>
                    <td className="px-4 py-3 max-w-[240px] truncate" title={row.error_message || ''}>
                      {row.error_message || 'Unknown error'}
                    </td>
                    <td className="px-4 py-3">{row.error_code || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">{formatReportDate(row.failed_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="btn btn-primary !py-1.5 !px-3 text-xs"
                        disabled={!row.retryable || busyId === row.id}
                        title={row.retryable ? 'Retry this message' : 'Already accepted by Meta; cannot resend'}
                        onClick={() => onRetryOne(row)}
                      >
                        {busyId === row.id ? 'Retrying…' : 'Retry'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--muted)]">
                    No data found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {pagination ? (
        <ReportPagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPage={onPage}
          onLimit={onLimit}
        />
      ) : null}
    </div>
  );
}
