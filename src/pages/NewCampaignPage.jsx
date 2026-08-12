import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  MessageSquare,
  Megaphone,
  Upload,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/PageShell';
import { StatusBadge } from '../components/ui';

const STEPS = [
  { key: 'details', label: 'Details', hint: 'Campaign details' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Select number' },
  { key: 'template', label: 'Template', hint: 'Choose template' },
  { key: 'contacts', label: 'Contacts', hint: 'Select audience' },
  { key: 'schedule', label: 'Schedule', hint: 'Set schedule' },
  { key: 'review', label: 'Review', hint: 'Review & send' },
];

const PRIORITY_HINTS = {
  low: 'Low priority campaigns are sent after normal ones.',
  normal: 'Normal priority campaigns will be sent in queue order.',
  high: 'High priority campaigns are preferred in the send queue.',
};

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseComponents(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function getTemplateBody(template) {
  const components = parseComponents(template?.components);
  const body = components.find((c) => String(c.type || '').toUpperCase() === 'BODY');
  return body?.text || '';
}

function getTemplatePlaceholders(template) {
  const text = getTemplateBody(template);
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))].sort(
    (a, b) => Number(a) - Number(b)
  );
}

function applyPreview(bodyText, mapping, sampleRow) {
  if (!bodyText) return '';
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const col = mapping[String(n)];
    const val = col ? sampleRow?.[col] : null;
    return val != null && String(val).trim() !== '' ? String(val) : `{{${n}}}`;
  });
}

function Stepper({ steps, stepIndex }) {
  return (
    <div className="card overflow-x-auto p-4 sm:p-5">
      <ol className="flex min-w-[640px] items-start justify-between gap-2">
        {steps.map((s, idx) => {
          const done = idx < stepIndex;
          const active = idx === stepIndex;
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
              {idx < steps.length - 1 ? (
                <div
                  className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-0.5 ${
                    done ? 'bg-[var(--wa)]' : 'bg-slate-200'
                  }`}
                />
              ) : null}
              <div
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${
                  done || active
                    ? 'bg-[var(--wa)] text-white shadow-sm shadow-[rgba(37,211,102,0.35)]'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : idx + 1}
              </div>
              <div
                className={`mt-2 text-sm font-extrabold ${
                  active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {s.label}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{s.hint}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SummarySidebar({
  selectedAccount,
  selectedTemplate,
  audienceCount,
  estimatedCost,
  costPerMessage,
  wallet,
  sendNow,
  scheduledAt,
}) {
  const balance = Number(wallet?.balance || 0);
  const sufficient = !estimatedCost || balance >= estimatedCost;
  const rows = [
    {
      label: 'Selected Number',
      value: selectedAccount?.phone_number || 'Not selected',
      ready: Boolean(selectedAccount),
    },
    {
      label: 'Template',
      value: selectedTemplate?.name || 'Not selected',
      ready: Boolean(selectedTemplate),
    },
    {
      label: 'Audience',
      value: audienceCount ? `${audienceCount.toLocaleString()} Contacts` : 'Not selected',
      ready: audienceCount > 0,
    },
    {
      label: 'Estimated Messages',
      value: audienceCount ? audienceCount.toLocaleString() : '—',
      ready: audienceCount > 0,
    },
    {
      label: 'Estimated Cost',
      value: audienceCount ? formatMoney(estimatedCost) : '—',
      ready: audienceCount > 0,
    },
  ];

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      <div className="card p-5">
        <div className="mb-4 font-extrabold text-slate-900">Quick Summary</div>
        <dl className="space-y-3 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">{r.label}</dt>
              <dd
                className={`max-w-[55%] text-right font-bold ${
                  r.ready ? 'text-[var(--wa-deep)]' : 'text-slate-400'
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
        {costPerMessage > 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {formatMoney(costPerMessage)} per message
            {selectedTemplate?.category ? ` · ${selectedTemplate.category}` : ''}
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <CalendarClock size={14} />
          {sendNow || !scheduledAt ? 'Instant Delivery' : `Scheduled · ${scheduledAt}`}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#ecfdf5] text-[var(--wa-deep)]">
            <Wallet size={16} />
          </span>
          Wallet Balance
        </div>
        <div className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--wa-deep)]">
          {formatMoney(balance)}
        </div>
        <div
          className={`mt-3 flex items-center gap-2 text-sm font-semibold ${
            sufficient ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          {sufficient ? <CheckCircle2 size={16} /> : <Zap size={16} />}
          {audienceCount
            ? sufficient
              ? 'Sufficient balance for this campaign'
              : 'Insufficient balance — recharge before sending'
            : 'Balance available for campaigns'}
        </div>
        {!sufficient && audienceCount ? (
          <Link to="/wallet" className="mt-3 inline-flex text-sm font-bold text-[var(--wa-deep)]">
            Go to Wallet →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stepKey, setStepKey] = useState('details');
  const [accounts, setAccounts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [estimate, setEstimate] = useState({ costPerMessage: 0, estimatedCost: 0 });
  const [file, setFile] = useState(null);
  const [csvStats, setCsvStats] = useState(null);
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvSample, setCsvSample] = useState(null);
  const [csvPreviewing, setCsvPreviewing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    campaignType: 'marketing',
    tags: [],
    priority: 'normal',
    notes: '',
    whatsappAccountId: '',
    templateId: '',
    contactGroupId: '',
    variableMapping: {},
    scheduledAt: '',
    sendNow: true,
    timezone: user?.timezone || 'Asia/Kolkata',
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/whatsapp'),
      api.get('/api/contacts/groups/available'),
      api.get('/api/wallet'),
      api.get('/api/campaigns/meta'),
    ])
      .then(([a, g, w, m]) => {
        setAccounts((a.data.data || []).filter((x) => x.status === 'connected'));
        setGroups(g.data.data || []);
        setWallet(w.data.data || null);
        setSuggestedTags(m.data.data?.tags || []);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!form.whatsappAccountId) {
      setTemplates([]);
      return;
    }
    api
      .get('/api/templates', {
        params: { status: 'APPROVED', accountId: form.whatsappAccountId },
      })
      .then((res) => setTemplates(res.data.data || []))
      .catch((err) => setError(getErrorMessage(err)));
  }, [form.whatsappAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(form.whatsappAccountId)),
    [accounts, form.whatsappAccountId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === String(form.templateId)),
    [templates, form.templateId]
  );
  const selectedGroup = useMemo(
    () => groups.find((g) => String(g.id) === String(form.contactGroupId)),
    [groups, form.contactGroupId]
  );
  const placeholders = useMemo(() => getTemplatePlaceholders(selectedTemplate), [selectedTemplate]);
  const needsVariables = placeholders.length > 0;
  const stepIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === stepKey)
  );

  const audienceCount = useMemo(() => {
    const groupCount = selectedGroup ? Number(selectedGroup.member_count || 0) : 0;
    const csvCount = file && csvStats ? Number(csvStats.valid || 0) : 0;
    // Approximate unique audience; backend dedupes on submit
    return groupCount + csvCount;
  }, [selectedGroup, file, csvStats]);

  useEffect(() => {
    if (!selectedTemplate || !placeholders.length) return;
    setForm((f) => {
      const next = { ...f.variableMapping };
      let changed = false;
      placeholders.forEach((n) => {
        if (!next[n]) {
          next[n] = n === '1' ? 'Name' : '';
          changed = true;
        }
      });
      return changed ? { ...f, variableMapping: next } : f;
    });
  }, [selectedTemplate, placeholders]);

  useEffect(() => {
    let cancelled = false;
    api
      .post('/api/campaigns/estimate', {
        templateId: form.templateId || null,
        category: selectedTemplate?.category || null,
        audienceCount,
      })
      .then((res) => {
        if (!cancelled) setEstimate(res.data.data || { costPerMessage: 0, estimatedCost: 0 });
      })
      .catch(() => {
        if (!cancelled) setEstimate({ costPerMessage: 0, estimatedCost: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [form.templateId, selectedTemplate?.category, audienceCount]);

  const mappingColumns = useMemo(() => {
    const cols = new Set(csvColumns);
    cols.add('Name');
    cols.add('name');
    return [...cols].filter(Boolean);
  }, [csvColumns]);

  const previewSample = csvSample || { Name: 'Rahul', name: 'Rahul' };
  const previewText = applyPreview(
    getTemplateBody(selectedTemplate),
    form.variableMapping,
    previewSample
  );

  function setField(patch) {
    setForm((f) => ({ ...f, ...patch }));
    setError('');
  }

  function addTag(raw) {
    const label = String(raw || '')
      .trim()
      .replace(/^#/, '')
      .slice(0, 40);
    if (!label) return;
    if (form.tags.some((t) => t.toLowerCase() === label.toLowerCase())) {
      setTagInput('');
      return;
    }
    if (form.tags.length >= 20) return;
    setField({ tags: [...form.tags, label] });
    setTagInput('');
  }

  function removeTag(label) {
    setField({ tags: form.tags.filter((t) => t !== label) });
  }

  async function onPickFile(picked) {
    setFile(picked);
    setCsvStats(null);
    setCsvColumns([]);
    setCsvSample(null);
    if (!picked) return;
    setCsvPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', picked);
      const { data } = await api.post('/api/campaigns/preview-csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvStats(data.data);
      setCsvColumns(data.data.columns || []);
      setCsvSample(data.data.sample?.[0] || null);
    } catch (err) {
      setError(getErrorMessage(err));
      setFile(null);
    } finally {
      setCsvPreviewing(false);
    }
  }

  function canContinue() {
    if (stepKey === 'details') {
      const name = form.name.trim();
      return name.length >= 2 && name.length <= 120;
    }
    if (stepKey === 'whatsapp') return Boolean(form.whatsappAccountId);
    if (stepKey === 'template') return Boolean(form.templateId);
    if (stepKey === 'contacts') {
      const hasAudience = Boolean(form.contactGroupId) || (file && csvStats && csvStats.valid > 0);
      if (!hasAudience) return false;
      if (needsVariables) {
        return placeholders.every((n) => String(form.variableMapping[n] || '').trim());
      }
      return true;
    }
    if (stepKey === 'schedule') {
      if (form.sendNow) return true;
      if (!form.scheduledAt) return false;
      return new Date(form.scheduledAt).getTime() > Date.now() + 30_000;
    }
    return true;
  }

  function goNext() {
    if (!canContinue()) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStepKey(next.key);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStepKey(prev.key);
  }

  async function submit({ saveAsDraft = false } = {}) {
    if (!saveAsDraft && stepKey === 'review' && !canContinue()) return;
    if (saveAsDraft && form.name.trim().length < 2) {
      setError('Campaign name is required to save a draft');
      setStepKey('details');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      if (form.description.trim()) fd.append('description', form.description.trim());
      fd.append('campaignType', form.campaignType);
      fd.append('tags', JSON.stringify(form.tags));
      fd.append('priority', form.priority);
      if (form.notes.trim()) fd.append('notes', form.notes.trim());
      if (form.whatsappAccountId) fd.append('whatsappAccountId', form.whatsappAccountId);
      if (form.templateId) fd.append('templateId', form.templateId);
      if (form.contactGroupId) fd.append('contactGroupId', form.contactGroupId);
      const mapping = {};
      placeholders.forEach((n) => {
        mapping[n] = form.variableMapping[n];
      });
      fd.append('variableMapping', JSON.stringify(mapping));
      fd.append('timezone', form.timezone || 'Asia/Kolkata');
      fd.append('saveAsDraft', String(saveAsDraft));
      const sendNow = !saveAsDraft && form.sendNow && !form.scheduledAt;
      fd.append('sendNow', String(sendNow));
      if (!saveAsDraft && !sendNow && form.scheduledAt) {
        fd.append('scheduledAt', new Date(form.scheduledAt).toISOString());
      }
      if (file) fd.append('file', file);

      const { data } = await api.post('/api/campaigns', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/campaigns/${data.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const goalLabel =
    form.campaignType === 'utility' ? 'Transactional updates & alerts' : 'Promote offers & discounts';

  return (
    <PageShell
      breadcrumb={[
        { label: 'Home', to: '/' },
        { label: 'Campaigns', to: '/campaigns' },
        { label: 'Create' },
      ]}
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <Stepper steps={STEPS} stepIndex={stepIndex} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {stepKey === 'details' ? (
            <>
              <div className="card space-y-5 p-5 sm:p-6">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">Campaign Details</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Give a name to your campaign and add a short description (optional).
                  </p>
                </div>
                <div>
                  <label className="label">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    maxLength={120}
                    placeholder="Summer Promotion 2026"
                    value={form.name}
                    onChange={(e) => setField({ name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Campaign Description</label>
                  <textarea
                    className="input min-h-[100px] resize-y"
                    maxLength={2000}
                    placeholder="This campaign is for our summer special offers and discounts."
                    value={form.description}
                    onChange={(e) => setField({ description: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-slate-50/80 px-4 py-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ecfdf5] text-[var(--wa-deep)]">
                      <Megaphone size={18} />
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Campaign Goal
                      </div>
                      <div className="text-sm font-bold text-slate-800">{goalLabel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-slate-50/80 px-4 py-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ecfdf5] text-[var(--wa-deep)]">
                      <CalendarClock size={18} />
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Estimated Duration
                      </div>
                      <div className="text-sm font-bold text-slate-800">Instant Delivery</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card space-y-5 p-5 sm:p-6">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">Additional Settings</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Organize this campaign with type, tags, and priority.
                  </p>
                </div>

                <div>
                  <div className="label mb-2">Campaign Type</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        value: 'marketing',
                        title: 'Marketing',
                        desc: 'Promotional messages and offers',
                        icon: Megaphone,
                      },
                      {
                        value: 'utility',
                        title: 'Utility',
                        desc: 'Transactional or update messages',
                        icon: MessageSquare,
                      },
                    ].map((opt) => {
                      const active = form.campaignType === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField({ campaignType: opt.value })}
                          className={`rounded-xl border p-4 text-left transition ${
                            active
                              ? 'border-[var(--wa)] bg-[#ecfdf5] ring-2 ring-[var(--wa)]/20'
                              : 'border-[var(--line)] hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`grid h-10 w-10 place-items-center rounded-xl ${
                                active
                                  ? 'bg-[var(--wa)] text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <Icon size={18} />
                            </span>
                            <div>
                              <div className="font-extrabold text-slate-900">{opt.title}</div>
                              <div className="mt-0.5 text-sm text-slate-500">{opt.desc}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">Tags (Optional)</label>
                  <div className="input flex min-h-[46px] flex-wrap items-center gap-2 py-2">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#ecfdf5] px-2 py-1 text-xs font-bold text-[var(--wa-deep)]"
                      >
                        {t}
                        <button
                          type="button"
                          className="text-[var(--wa-deep)]/70 hover:text-slate-800"
                          onClick={() => removeTag(t)}
                          aria-label={`Remove ${t}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      className="min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm outline-none"
                      placeholder="Select or type tags..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addTag(tagInput);
                        } else if (e.key === 'Backspace' && !tagInput && form.tags.length) {
                          removeTag(form.tags[form.tags.length - 1]);
                        }
                      }}
                      onBlur={() => addTag(tagInput)}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Add labels to organize your campaigns better.
                  </p>
                  {suggestedTags.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedTags
                        .filter((t) => !form.tags.includes(t))
                        .slice(0, 8)
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                            onClick={() => addTag(t)}
                          >
                            + {t}
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="label">Campaign Priority</label>
                  <div className="relative">
                    <Zap
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"
                    />
                    <select
                      className="input pl-9"
                      value={form.priority}
                      onChange={(e) => setField({ priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{PRIORITY_HINTS[form.priority]}</p>
                </div>

                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea
                    className="input min-h-[90px] resize-y"
                    maxLength={5000}
                    placeholder="Add any additional notes about this campaign..."
                    value={form.notes}
                    onChange={(e) => setField({ notes: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : null}

          {stepKey === 'whatsapp' ? (
            <div className="card space-y-4 p-5 sm:p-6">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Select WhatsApp Number</div>
                <p className="mt-1 text-sm text-slate-500">
                  Only connected WhatsApp Business numbers are listed.
                </p>
              </div>
              {!accounts.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No connected numbers.{' '}
                  <Link className="font-bold text-[var(--wa-deep)]" to="/whatsapp">
                    Connect a number
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {accounts.map((a) => {
                    const active = String(a.id) === String(form.whatsappAccountId);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setField({
                            whatsappAccountId: String(a.id),
                            templateId: '',
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-[var(--wa)] bg-[#ecfdf5] ring-2 ring-[var(--wa)]/20'
                            : 'border-[var(--line)] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-extrabold text-slate-900">
                            {a.phone_number || a.phone_number_id}
                          </div>
                          <StatusBadge status="Connected" />
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Business Name: {a.business_name || '—'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {stepKey === 'template' ? (
            <div className="card space-y-4 p-5 sm:p-6">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Choose Template</div>
                <p className="mt-1 text-sm text-slate-500">
                  Approved templates for {selectedAccount?.phone_number || 'the selected number'}.
                </p>
              </div>
              {!templates.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No approved templates for this number.{' '}
                  <Link className="font-bold text-[var(--wa-deep)]" to="/templates">
                    Manage templates
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {templates.map((t) => {
                    const active = String(t.id) === String(form.templateId);
                    const body = getTemplateBody(t);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setField({ templateId: String(t.id), variableMapping: {} })}
                        className={`rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-[var(--wa)] bg-[#ecfdf5] ring-2 ring-[var(--wa)]/20'
                            : 'border-[var(--line)] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-extrabold text-slate-900">{t.name}</div>
                          <StatusBadge status={t.status || 'APPROVED'} />
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Language: {t.language} · Category: {t.category}
                        </div>
                        {body ? (
                          <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-sm text-slate-600">
                            {body}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {stepKey === 'contacts' ? (
            <div className="card space-y-5 p-5 sm:p-6">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Select Audience</div>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a contact group, upload a CSV/XLSX, or both. At least one source is required.
                </p>
              </div>

              <div className="grid gap-3">
                {groups.map((g) => {
                  const active = String(g.id) === String(form.contactGroupId);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setField({
                          contactGroupId: active ? '' : String(g.id),
                        })
                      }
                      className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-[var(--wa)] bg-[#ecfdf5] ring-2 ring-[var(--wa)]/20'
                          : 'border-[var(--line)] hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-extrabold text-slate-900">{g.name}</div>
                      <div className="text-sm font-semibold text-slate-500">
                        {Number(g.member_count || 0).toLocaleString()} contacts
                      </div>
                    </button>
                  );
                })}
                {!groups.length ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No groups yet. You can still continue with a CSV upload.
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 font-bold text-slate-800">Upload CSV / XLSX (Optional)</div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:bg-slate-100">
                  <Upload className="mb-2 text-slate-400" size={22} />
                  <div className="text-sm font-bold text-slate-700">
                    {file ? file.name : 'Click to upload CSV / XLSX'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Include a Phone (or Mobile) column. Duplicates are removed automatically.
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                  />
                </label>
                {csvPreviewing ? <div className="mt-2 text-sm text-slate-500">Validating file…</div> : null}
                {csvStats ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-emerald-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-emerald-700">Valid</div>
                      <div className="text-xl font-extrabold text-emerald-800">{csvStats.valid}</div>
                    </div>
                    <div className="rounded-xl bg-red-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-red-700">Invalid</div>
                      <div className="text-xl font-extrabold text-red-800">{csvStats.invalid}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase text-amber-700">Duplicates</div>
                      <div className="text-xl font-extrabold text-amber-800">{csvStats.duplicates}</div>
                    </div>
                  </div>
                ) : null}
                {file ? (
                  <button type="button" className="btn btn-secondary mt-3" onClick={() => onPickFile(null)}>
                    Remove file
                  </button>
                ) : null}
              </div>

              {needsVariables ? (
                <div className="space-y-3 border-t border-[var(--line)] pt-5">
                  <div className="font-extrabold text-slate-900">Variable Mapping</div>
                  <p className="text-sm text-slate-500">
                    Map each template placeholder to a contact/CSV column.
                  </p>
                  <div className="grid gap-3">
                    {placeholders.map((n) => (
                      <div key={n}>
                        <label className="label">{`{{${n}}}`} column</label>
                        {mappingColumns.length ? (
                          <select
                            className="input"
                            value={form.variableMapping[n] || ''}
                            onChange={(e) =>
                              setField({
                                variableMapping: { ...form.variableMapping, [n]: e.target.value },
                              })
                            }
                          >
                            <option value="">Select column</option>
                            {mappingColumns.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="input"
                            placeholder="e.g. Name"
                            value={form.variableMapping[n] || ''}
                            onChange={(e) =>
                              setField({
                                variableMapping: { ...form.variableMapping, [n]: e.target.value },
                              })
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Preview
                    </div>
                    <div className="whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-white p-3 text-sm text-slate-700">
                      {previewText || '—'}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {stepKey === 'schedule' ? (
            <div className="card space-y-4 p-5 sm:p-6">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Set Schedule</div>
                <p className="mt-1 text-sm text-slate-500">
                  Send immediately or pick a future date and time.
                </p>
              </div>
              <div className="grid gap-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                    form.sendNow ? 'border-[var(--wa)] bg-[#ecfdf5]' : 'border-[var(--line)]'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={form.sendNow}
                    onChange={() => setField({ sendNow: true, scheduledAt: '' })}
                  />
                  <div>
                    <div className="font-bold text-slate-900">Send Immediately</div>
                    <div className="text-sm text-slate-500">
                      Queue and start sending after confirmation.
                    </div>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                    !form.sendNow ? 'border-[var(--wa)] bg-[#ecfdf5]' : 'border-[var(--line)]'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={!form.sendNow}
                    onChange={() => setField({ sendNow: false })}
                  />
                  <div className="w-full">
                    <div className="font-bold text-slate-900">Schedule Campaign</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label">Date & time</label>
                        <input
                          className="input"
                          type="datetime-local"
                          disabled={form.sendNow}
                          value={form.scheduledAt}
                          onChange={(e) => setField({ scheduledAt: e.target.value, sendNow: false })}
                        />
                      </div>
                      <div>
                        <label className="label">Timezone</label>
                        <input
                          className="input"
                          value={form.timezone}
                          disabled={form.sendNow}
                          onChange={(e) => setField({ timezone: e.target.value })}
                          placeholder="Asia/Kolkata"
                        />
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ) : null}

          {stepKey === 'review' ? (
            <div className="card space-y-4 p-5 sm:p-6">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Review & Send</div>
                <p className="mt-1 text-sm text-slate-500">
                  Confirm details before launching. Wallet pricing applies per message.
                </p>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <div>
                  <span className="text-slate-500">Campaign:</span> <b>{form.name.trim()}</b>
                </div>
                {form.description.trim() ? (
                  <div>
                    <span className="text-slate-500">Description:</span> <b>{form.description.trim()}</b>
                  </div>
                ) : null}
                <div>
                  <span className="text-slate-500">Type:</span>{' '}
                  <b className="capitalize">{form.campaignType}</b>
                  {form.tags.length ? (
                    <>
                      {' '}
                      · Tags: <b>{form.tags.join(', ')}</b>
                    </>
                  ) : null}
                </div>
                <div>
                  <span className="text-slate-500">Priority:</span>{' '}
                  <b className="capitalize">{form.priority}</b>
                </div>
                <div>
                  <span className="text-slate-500">WhatsApp Number:</span>{' '}
                  <b>{selectedAccount?.phone_number || '—'}</b>
                </div>
                <div>
                  <span className="text-slate-500">Template:</span> <b>{selectedTemplate?.name || '—'}</b>
                </div>
                <div>
                  <span className="text-slate-500">Audience:</span>{' '}
                  <b>
                    {selectedGroup
                      ? `${selectedGroup.name} (${Number(selectedGroup.member_count || 0).toLocaleString()})`
                      : 'No group'}
                    {file ? ` + CSV (${csvStats?.valid ?? '—'} valid)` : ''}
                  </b>
                </div>
                <div>
                  <span className="text-slate-500">Estimated Cost:</span>{' '}
                  <b>{formatMoney(estimate.estimatedCost)}</b>
                </div>
                <div>
                  <span className="text-slate-500">Sending:</span>{' '}
                  <b>
                    {form.sendNow || !form.scheduledAt
                      ? 'Immediately'
                      : `${form.scheduledAt} (${form.timezone})`}
                  </b>
                </div>
                {form.notes.trim() ? (
                  <div>
                    <span className="text-slate-500">Notes:</span> <b>{form.notes.trim()}</b>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => (stepIndex === 0 ? navigate('/campaigns') : goBack())}
            >
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading || form.name.trim().length < 2}
                onClick={() => submit({ saveAsDraft: true })}
              >
                {loading ? 'Saving…' : 'Save as Draft'}
              </button>
              {stepKey !== 'review' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canContinue()}
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading || !canContinue()}
                  onClick={() => submit({ saveAsDraft: false })}
                >
                  {loading
                    ? 'Creating…'
                    : form.sendNow || !form.scheduledAt
                      ? 'Send Campaign'
                      : 'Schedule Campaign'}
                </button>
              )}
            </div>
          </div>
        </div>

        <SummarySidebar
          selectedAccount={selectedAccount}
          selectedTemplate={selectedTemplate}
          audienceCount={audienceCount}
          estimatedCost={estimate.estimatedCost}
          costPerMessage={estimate.costPerMessage}
          wallet={wallet}
          sendNow={form.sendNow}
          scheduledAt={form.scheduledAt}
        />
      </div>
    </PageShell>
  );
}
