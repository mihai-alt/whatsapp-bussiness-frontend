import { Link } from 'react-router';
import {
  campaignStatusClass,
  formatCampaignStatus,
  formatCount,
  formatInr,
  formatPct,
  formatReportDate,
  PAGE_SIZE_OPTIONS,
  paginationItems,
} from './reportUtils';

export function ReportPagination({ page, limit, total, totalPages, onPage, onLimit }) {
  const last = Math.max(1, Number(totalPages) || 1);
  const current = Math.min(last, Math.max(1, Number(page) || 1));
  const items = paginationItems(current, last);
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-[var(--muted)]">
        Showing {total ? (current - 1) * Number(limit || 25) + 1 : 0}–
        {Math.min(current * Number(limit || 25), Number(total || 0))} of {formatCount(total)} entries
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-xs font-bold"
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary !py-1.5 !px-3 text-xs" disabled={current <= 1} onClick={() => onPage(current - 1)}>
          Previous
        </button>
        {items.map((item, idx) =>
          item === '…' ? (
            <span key={`e${idx}`} className="px-1 text-[var(--muted)]">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-bold ${
                item === current ? 'bg-[var(--wa)] text-white' : 'border border-[var(--line)] text-[var(--muted)]'
              }`}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          )
        )}
        <button type="button" className="btn btn-secondary !py-1.5 !px-3 text-xs" disabled={current >= last} onClick={() => onPage(current + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function CampaignPerformanceTable({
  rows,
  loading,
  error,
  empty = 'No data found for the selected filters.',
  onRetry,
  viewAllTo,
  pagination,
  onPage,
  onLimit,
  detailed = false,
  title = 'Campaign Performance',
}) {
  const headers = detailed
    ? ['Campaign', 'Template', 'Contacts', 'Sent', 'Delivered', 'Read', 'Failed', 'Pending', 'Delivery Rate', 'Read Rate', 'Cost', 'Status', 'Created At']
    : ['Campaign', 'Template', 'Contacts', 'Sent', 'Delivered', 'Read', 'Failed', 'Pending', 'Cost', 'Status', 'Created At'];
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="font-extrabold text-[var(--ink)]">{title}</div>
        {viewAllTo ? (
          <Link to={viewAllTo} className="text-sm font-bold text-[var(--wa-deep)] hover:underline">
            View All
          </Link>
        ) : null}
      </div>
      {error ? (
        <div className="p-6 text-center text-sm text-[var(--muted)]">
          Something went wrong while loading this report.
          <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-[var(--panel-2)] text-left text-[var(--faint)]">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--line)]">
                    <td colSpan={headers.length} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-[var(--panel-2)]" />
                    </td>
                  </tr>
                ))
              ) : rows?.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--line)] hover:bg-[var(--hover)]">
                    <td className="px-4 py-3 font-bold">
                      <Link className="hover:text-[var(--wa-deep)]" to={`/reports/campaigns/${row.id}`}>
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.template_name || '—'}</td>
                    <td className="px-4 py-3">{formatCount(row.contacts)}</td>
                    <td className="px-4 py-3">{formatCount(row.sent)}</td>
                    <td className="px-4 py-3">{formatCount(row.delivered)}</td>
                    <td className="px-4 py-3">{formatCount(row.read)}</td>
                    <td className="px-4 py-3">{formatCount(row.failed)}</td>
                    <td className="px-4 py-3">{formatCount(row.pending)}</td>
                    {detailed ? (
                      <>
                        <td className="px-4 py-3">{formatPct(row.delivery_rate)}</td>
                        <td className="px-4 py-3">{formatPct(row.read_rate)}</td>
                      </>
                    ) : null}
                    <td className="px-4 py-3">{formatInr(row.cost)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${campaignStatusClass(row.status)}`}>{formatCampaignStatus(row.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">{formatReportDate(row.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-10 text-center text-[var(--muted)]">
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

export function CampaignReportsTable(props) {
  return (
    <CampaignPerformanceTable
      {...props}
    />
  );
}

export function formatDeliveryCell(row) {
  return `${formatPct(row.delivery_rate)} / ${formatPct(row.read_rate)}`;
}
