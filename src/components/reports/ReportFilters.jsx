import { Download } from 'lucide-react';
import { RANGE_OPTIONS, MESSAGE_STATUS_OPTIONS } from './reportUtils';
import { REPORT_TZ } from './reportUtils';

export function ReportFilters({
  draft,
  setDraft,
  onApply,
  onReset,
  onExport,
  meta,
  exporting = false,
  showStatus = true,
  showCampaign = true,
  showTemplate = false,
  showCampaignStatus = false,
  extra,
}) {
  const accounts = Array.isArray(meta?.accounts) ? meta.accounts : [];
  const campaigns = Array.isArray(meta?.campaigns) ? meta.campaigns : [];
  const templates = Array.isArray(meta?.templates) ? meta.templates : [];
  const timezone = meta?.timezone || REPORT_TZ;

  return (
    <div className="card p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
          Date Range
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            value={draft.range}
            onChange={(e) => setDraft((d) => ({ ...d, range: e.target.value }))}
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
          WhatsApp Number
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            value={draft.whatsappAccountId}
            onChange={(e) => setDraft((d) => ({ ...d, whatsappAccountId: e.target.value }))}
          >
            <option value="">All Numbers</option>
            {accounts.map((row) => (
              <option key={row.id} value={row.id}>
                {row.phone_number}
                {row.business_name ? ` · ${row.business_name}` : ''}
              </option>
            ))}
          </select>
        </label>
        {showCampaign ? (
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
            Campaign
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              value={draft.campaignId}
              onChange={(e) => setDraft((d) => ({ ...d, campaignId: e.target.value }))}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showStatus ? (
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
            >
              {MESSAGE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showCampaignStatus ? (
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
            Campaign Status
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              value={draft.campaignStatus}
              onChange={(e) => setDraft((d) => ({ ...d, campaignStatus: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        ) : null}
        {showTemplate ? (
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
            Template
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              value={draft.templateId}
              onChange={(e) => setDraft((d) => ({ ...d, templateId: e.target.value }))}
            >
              <option value="">All Templates</option>
              {templates.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {draft.range === 'custom' ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
            From
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--faint)]">
            To
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => onApply()}>
            Apply Filter
          </button>
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Reset
          </button>
          {onExport ? (
            <button type="button" className="btn btn-secondary" disabled={exporting} onClick={onExport}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export'}
            </button>
          ) : null}
          {extra}
        </div>
        <div className="text-xs font-semibold text-[var(--muted)]">
          All times are in {timezone} (IST).
        </div>
      </div>
    </div>
  );
}
