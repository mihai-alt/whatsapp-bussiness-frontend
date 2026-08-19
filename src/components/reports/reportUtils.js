export const REPORT_TZ = 'Asia/Kolkata';

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

export const MESSAGE_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
];

export const CAMPAIGN_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const DEFAULT_REPORT_FILTERS = {
  range: 'last_7_days',
  from: '',
  to: '',
  whatsappAccountId: '',
  campaignId: '',
  templateId: '',
  status: '',
  campaignStatus: '',
  search: '',
  page: 1,
  limit: 25,
  groupBy: 'day',
};

export function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatReportDate(value, timeZone = REPORT_TZ) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString('en-IN', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCampaignStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending_approval') return 'Pending approval';
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function campaignStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (['completed', 'delivered', 'read', 'sent'].includes(s)) return 'badge-ok';
  if (['running', 'queued', 'in progress'].includes(s)) return 'badge-info';
  if (['scheduled', 'paused', 'pending', 'draft', 'pending_approval'].includes(s)) return 'badge-warn';
  if (['failed', 'cancelled', 'rejected'].includes(s)) return 'badge-danger';
  return 'badge-muted';
}

export function messageStatusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'read' || s === 'delivered') return 'badge-ok';
  if (s === 'sent') return 'badge-info';
  if (s === 'pending' || s === 'queued') return 'badge-warn';
  if (s === 'failed' || s === 'cancelled') return 'badge-danger';
  return 'badge-muted';
}

export function paginationItems(page, totalPages) {
  const last = Math.max(1, Number(totalPages) || 1);
  const current = Math.min(last, Math.max(1, Number(page) || 1));
  const items = [];
  const push = (value) => {
    if (!items.includes(value)) items.push(value);
  };
  push(1);
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i > 1 && i < last) push(i);
  }
  if (last > 1) push(last);
  const out = [];
  items.sort((a, b) => a - b).forEach((value, idx) => {
    if (idx > 0 && value - items[idx - 1] > 1) out.push('…');
    out.push(value);
  });
  return out;
}
