import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileEdit,
  FileText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { PageShell, IconAction } from '../components/PageShell';
import { StatusBadge } from '../components/ui';

const PAGE_SIZE = 10;

const LANGUAGES = [
  { value: 'en_US', label: 'English (US)', flag: '🇺🇸' },
  { value: 'en_GB', label: 'English (UK)', flag: '🇬🇧' },
  { value: 'hi_IN', label: 'Hindi', flag: '🇮🇳' },
  { value: 'es_ES', label: 'Spanish', flag: '🇪🇸' },
];

const STATUS_TABS = [
  { value: '', label: 'All', dot: null },
  { value: 'APPROVED', label: 'Approved', dot: 'bg-emerald-500' },
  { value: 'PENDING', label: 'Pending', dot: 'bg-amber-400' },
  { value: 'REJECTED', label: 'Rejected', dot: 'bg-red-500' },
  { value: 'DRAFT', label: 'Draft', dot: 'bg-slate-400' },
];

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function languageMetaFallback(code) {
  return LANGUAGES.find((l) => l.value === code) || { value: code, label: code, flag: '🌐' };
}

function categoryBadgeClass(category) {
  const c = String(category || '').toUpperCase();
  if (c === 'MARKETING') return 'bg-violet-100 text-violet-700';
  if (c === 'AUTHENTICATION') return 'bg-sky-100 text-sky-700';
  return 'bg-slate-100 text-slate-600';
}

function parseBody(components) {
  if (!components) return '';
  let list = components;
  if (typeof components === 'string') {
    try {
      list = JSON.parse(components);
    } catch {
      return '';
    }
  }
  if (!Array.isArray(list)) return '';
  const body = list.find((c) => String(c.type || '').toUpperCase() === 'BODY');
  return body?.text || '';
}

function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
        <div className="mt-0.5 text-xs text-slate-500">{hint}</div>
      </div>
    </div>
  );
}

function RowMenu({ row, onSubmit, onDelete, onView }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <IconAction title="More" onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={14} />
      </IconAction>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[var(--line)] bg-white py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onView(row);
            }}
          >
            <Eye size={14} /> View
          </button>
          {['DRAFT', 'REJECTED'].includes(row.status) ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onSubmit(row.id);
              }}
            >
              <Send size={14} /> Submit
            </button>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete(row.id);
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [languages, setLanguages] = useState(LANGUAGES);
  const [categories, setCategories] = useState([
    { value: 'UTILITY', label: 'UTILITY' },
    { value: 'MARKETING', label: 'MARKETING' },
    { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
  ]);
  const [guidelinesUrl, setGuidelinesUrl] = useState(
    'https://developers.facebook.com/docs/whatsapp/message-templates/guidelines'
  );
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    draft: 0,
    approvedPct: 0,
    pendingPct: 0,
    rejectedPct: 0,
    draftPct: 0,
  });
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(true);
  const [viewRow, setViewRow] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    whatsappAccountId: '',
    name: '',
    language: 'en_US',
    category: 'UTILITY',
    bodyText: '',
  });

  async function loadList(opts = {}) {
    const nextPage = opts.page ?? page;
    const nextStatus = opts.status ?? status;
    const nextQuery = opts.query ?? query;
    const { data } = await api.get('/api/templates', {
      params: {
        paged: true,
        page: nextPage,
        limit: PAGE_SIZE,
        status: nextStatus || undefined,
        search: nextQuery || undefined,
        includeStats: true,
      },
    });
    const payload = data.data || {};
    setTemplates(payload.rows || []);
    setTotal(payload.total || 0);
    setPage(payload.page || nextPage);
    if (payload.stats) setStats(payload.stats);
  }

  async function loadBootstrap() {
    const [a, m, s] = await Promise.all([
      api.get('/api/whatsapp'),
      api.get('/api/templates/meta'),
      api.get('/api/templates/stats'),
    ]);
    const connected = (a.data.data || []).filter((x) => x.status === 'connected');
    setAccounts(connected);
    setForm((f) =>
      !f.whatsappAccountId && connected[0]
        ? { ...f, whatsappAccountId: String(connected[0].id) }
        : f
    );
    if (m.data.data?.languages?.length) setLanguages(m.data.data.languages);
    if (m.data.data?.categories?.length) setCategories(m.data.data.categories);
    if (m.data.data?.guidelinesUrl) setGuidelinesUrl(m.data.data.guidelinesUrl);
    if (s.data.data) setStats(s.data.data);
  }

  useEffect(() => {
    loadBootstrap().catch((err) => setError(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadList({ page, status, query })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, query]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = total ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(safePage * PAGE_SIZE, total);

  function pctHint(n) {
    return `${Number(n || 0).toFixed(2)}% of total`;
  }

  async function refreshAfterMutation() {
    const [{ data: s }] = await Promise.all([
      api.get('/api/templates/stats'),
      loadList({ page: 1, status, query }),
    ]);
    if (s.data) setStats(s.data);
    setPage(1);
  }

  async function createTemplate(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/api/templates', {
        whatsappAccountId: Number(form.whatsappAccountId),
        name: form.name,
        language: form.language,
        category: form.category,
        bodyText: form.bodyText || 'Hello {{1}}, your code is {{2}}.',
        components: [
          {
            type: 'BODY',
            text: form.bodyText || 'Hello {{1}}, your code is {{2}}.',
            example: { body_text: [['Sample1', 'Sample2']] },
          },
        ],
      });
      setForm((f) => ({ ...f, name: '', bodyText: '' }));
      setMessage('Template saved as draft');
      await refreshAfterMutation();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function submit(id) {
    setError('');
    try {
      await api.post(`/api/templates/${id}/submit`);
      setMessage('Template submitted to Meta');
      const [{ data: s }] = await Promise.all([api.get('/api/templates/stats'), loadList()]);
      if (s.data) setStats(s.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function sync() {
    setError('');
    setMessage('');
    const accountId = form.whatsappAccountId || accounts[0]?.id;
    if (!accountId) {
      setError('Connect a WhatsApp number before syncing templates');
      return;
    }
    try {
      const { data } = await api.post('/api/templates/sync', {
        whatsappAccountId: Number(accountId),
      });
      if (data.data?.stats) setStats(data.data.stats);
      setMessage(`Templates synced from Meta (${data.data?.upserted ?? 0} updated)`);
      await loadList({ page: 1 });
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function remove(id) {
    if (!confirm('Delete template?')) return;
    setError('');
    try {
      await api.delete(`/api/templates/${id}`);
      setMessage('Template deleted');
      await refreshAfterMutation();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function applySearch() {
    setPage(1);
    setQuery(search.trim());
  }

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Templates' }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* <button type="button" className="btn btn-secondary" onClick={sync}>
            <RefreshCw size={16} /> Sync
          </button>           */}
        </div>
      }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
      ) : null}

      {/* Filters + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatus(tab.value);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  active
                    ? 'bg-[var(--wa)] text-white shadow-sm'
                    : 'border border-[var(--line)] bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.dot ? <span className={`h-2 w-2 rounded-full ${tab.dot}`} /> : null}
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input min-w-[200px] !py-2 sm:w-56"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
          />
          <button type="button" className="btn btn-secondary !py-2" onClick={applySearch}>
            <Search size={15} /> Search
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Templates"
          value={stats.total}
          hint="All time"
          icon={FileText}
          tone="bg-[#e8faf0] text-[var(--wa-deep)]"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          hint={pctHint(stats.approvedPct)}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          hint={pctHint(stats.pendingPct)}
          icon={Clock3}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          hint={pctHint(stats.rejectedPct)}
          icon={XCircle}
          tone="bg-red-50 text-red-500"
        />
        <StatCard
          label="Draft"
          value={stats.draft}
          hint={pctHint(stats.draftPct)}
          icon={FileEdit}
          tone="bg-slate-100 text-slate-500"
        />
      </div>

      {/* Create form */}
      {showCreate ? (
        <form onSubmit={createTemplate} className="card space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf0] text-[var(--wa-deep)]">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900">Create Template</div>
              <p className="text-sm text-slate-500">Create a new WhatsApp message template.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">WhatsApp Account</label>
              <select
                className="input"
                value={form.whatsappAccountId}
                onChange={(e) => setForm({ ...form, whatsappAccountId: e.target.value })}
                required
              >
                <option value="">Select WhatsApp account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.phone_number || a.phone_number_id}
                    {a.business_name ? ` · ${a.business_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Template Name (lowercase_with_underscores)</label>
              <input
                className="input"
                placeholder="e.g. summer_offer_2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                pattern="[a-z0-9_]+"
              />
            </div>
            <div>
              <label className="label">Language</label>
              <select
                className="input"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                {languages.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.flag ? `${l.flag} ` : ''}
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label || c.value}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Body Text</label>
              <textarea
                className="input min-h-[110px]"
                placeholder="e.g. Hello {{1}}, your verification code is {{2}}."
                value={form.bodyText}
                onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Use variables like {'{{1}}'}, {'{{2}}'} for dynamic content.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary">
                Save Draft
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-[#ecfdf5] px-4 py-3 text-sm">
              <div className="font-bold text-emerald-800">Template Guidelines</div>
              <a
                href={guidelinesUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-block font-semibold text-[var(--wa-deep)] hover:underline"
              >
                View WhatsApp template guidelines
              </a>
            </div>
          </div>
        </form>
      ) : null}

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setViewRow(null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-900">{viewRow.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <StatusBadge status={viewRow.status} />
                  <span>{viewRow.category}</span>
                  <span>·</span>
                  <span>{viewRow.language}</span>
                </div>
              </div>
              <button type="button" className="btn btn-secondary !py-1.5" onClick={() => setViewRow(null)}>
                Close
              </button>
            </div>
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {parseBody(viewRow.components) || 'No body text'}
            </div>
            {viewRow.rejection_reason ? (
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {viewRow.rejection_reason}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
