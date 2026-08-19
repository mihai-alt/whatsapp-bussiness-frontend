import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router';
import {
  Wallet,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  History,
  Receipt,
  Building2,
  Loader2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { openRazorpayCheckout } from '../lib/razorpay';
import { useAuth } from '../context/AuthContext';
import { PageShell, DataTable } from '../components/PageShell';
import { StatusBadge, PageLoader } from '../components/ui';

const PRESETS = [500, 1000, 2000, 5000, 10000];

function money(n) {
  return `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyAxis(n) {
  const v = Number(n || 0);
  if (v >= 1000) {
    return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `₹${v}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 19);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatChartDay(day) {
  if (!day) return '';
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return String(day).slice(5);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function txTypeMeta(row) {
  if (row.reference_type === 'recharge' || row.reference_type === 'admin_credit') {
    return { label: 'Recharge', tone: 'ok' };
  }
  if (row.reference_type === 'campaign_message') {
    return { label: 'Deduction', tone: 'danger' };
  }
  if (row.type === 'refund') return { label: 'Refund', tone: 'info' };
  if (row.type === 'debit') return { label: 'Deduction', tone: 'danger' };
  return { label: 'Credit', tone: 'ok' };
}

function statusUi(status) {
  const s = String(status || 'success').toLowerCase();
  if (['success', 'completed', 'ok'].includes(s)) return 'Success';
  if (['pending', 'processing', 'queued'].includes(s)) return 'Pending';
  if (['failed', 'error'].includes(s)) return 'Failed';
  if (['cancelled', 'canceled'].includes(s)) return 'Cancelled';
  return status || 'Success';
}

function parseTxDescription(row) {
  const raw = String(row.description || '').trim();
  if (!raw) return { title: '—', subtitle: null };

  const campaignMatch = raw.match(/^(Campaign:\s*.+?)(?:\s*[·•|\-–—]\s*|\s+)(\d+\s*messages?)$/i);
  if (campaignMatch) {
    return { title: campaignMatch[1].trim(), subtitle: campaignMatch[2].trim() };
  }

  if (row.message_count != null && Number(row.message_count) > 0) {
    const title = raw.replace(/\s*\d+\s*messages?\s*$/i, '').trim() || raw;
    return { title, subtitle: `${Number(row.message_count)} messages` };
  }

  const lines = raw.split(/\n+/);
  if (lines.length > 1) {
    return { title: lines[0], subtitle: lines.slice(1).join(' ') };
  }

  return { title: raw, subtitle: null };
}

function BalanceChart({ points }) {
  const w = 720;
  const h = 260;
  const padL = 58;
  const padR = 16;
  const padT = 16;
  const padB = 36;

  if (!points?.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No wallet history available
      </div>
    );
  }

  const values = points.map((p) => Number(p.balance || 0));
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const niceMax = Math.max(1, Math.ceil(rawMax / 5000) * 5000 || 5000);
  const niceMin = rawMin < 0 ? Math.floor(rawMin / 1000) * 1000 : 0;
  const span = Math.max(1, niceMax - niceMin);
  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks }, (_, i) => niceMax - (i * span) / (yTicks - 1));

  const coords = points.map((p, i) => {
    const x = padL + (i * (w - padL - padR)) / Math.max(points.length - 1, 1);
    const y = padT + ((niceMax - Number(p.balance || 0)) / span) * (h - padT - padB);
    return { x, y, label: formatChartDay(p.day), balance: Number(p.balance || 0) };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const area = `${padL},${h - padB} ${line} ${coords[coords.length - 1].x},${h - padB}`;

  const labelStep = Math.max(1, Math.ceil(coords.length / 7));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full sm:h-64" role="img" aria-label="Balance overview chart">
      <defs>
        <linearGradient id="walletBalanceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25D366" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#25D366" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {tickValues.map((val, i) => {
        const y = padT + (i * (h - padT - padB)) / (yTicks - 1);
        return (
          <g key={`ytick-${i}`}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
            <text x={padL - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {moneyAxis(val)}
            </text>
          </g>
        );
      })}

      <polygon points={area} fill="url(#walletBalanceFill)" />
      <polyline
        fill="none"
        stroke="#25D366"
        strokeWidth="2.5"
        points={line}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, i) => (
        <circle key={`pt-${i}`} cx={c.x} cy={c.y} r="3.5" fill="#25D366" stroke="#fff" strokeWidth="1.5" />
      ))}
      {coords.map((c, i) =>
        i % labelStep === 0 || i === coords.length - 1 ? (
          <text key={`xl-${i}`} x={c.x} y={h - 10} textAnchor="middle" fontSize="11" fill="#94a3b8">
            {c.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

function RazorpayMark() {
  return (
    <span className="select-none text-[13px] font-extrabold tracking-tight" aria-hidden>
      <span className="text-[#072654]">Razor</span>
      <span className="text-[#2b84ea]">pay</span>
    </span>
  );
}

export default function AdminWalletPage() {
  const { user, isAdmin } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState('month');
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showRecharge, setShowRecharge] = useState(false);
  const [preset, setPreset] = useState(5000);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [payMethod, setPayMethod] = useState('razorpay');
  const [paying, setPaying] = useState(false);

  const selectedAmount = useMemo(() => {
    if (customMode) {
      const n = Number(customAmount);
      return Number.isFinite(n) ? n : 0;
    }
    return Number(preset);
  }, [customMode, customAmount, preset]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [w, h, t] = await Promise.all([
        api.get('/api/admin/wallet'),
        api.get('/api/admin/wallet/balance-history', { params: { period } }),
        api.get('/api/admin/wallet/transactions', { params: { limit: 5 } }),
      ]);
      setWallet(w.data.data);
      setHistory(h.data.data.points || []);
      setRecent(t.data.data.rows || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, isAdmin]);

  if (!isAdmin) return <Navigate to="/wallet" replace />;

  async function recharge() {
    setError('');
    setMessage('');
    const min = Number(wallet?.minRecharge || 100);
    const max = Number(wallet?.maxRecharge || 100000);
    if (!selectedAmount || selectedAmount < min || selectedAmount > max) {
      setError(`Enter an amount between ${money(min)} and ${money(max)}`);
      return;
    }

    setPaying(true);
    try {
      if (payMethod === 'bank_transfer') {
        const { data } = await api.post('/api/wallet/recharge/manual-intent', {
          amount: selectedAmount,
          method: 'bank_transfer',
        });
        setShowRecharge(false);
        setMessage(data.data.message || 'Bank transfer request recorded.');
        await load();
        return;
      }

      if (!wallet?.razorpayConfigured) {
        setError('Razorpay is not configured.');
        return;
      }

      const { data } = await api.post('/api/wallet/recharge/create-order', {
        amount: selectedAmount,
      });

      const checkout = await openRazorpayCheckout({
        keyId: data.keyId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'WhatsApp Business BSP',
        description: 'Business Wallet Recharge',
        prefill: { name: user?.name || '', email: user?.email || '' },
      });

      if (checkout.status === 'dismissed') {
        await api
          .post('/api/wallet/recharge/cancel', {
            razorpay_order_id: data.orderId,
            reason: 'checkout_dismissed',
          })
          .catch(() => {});
        setMessage('Payment cancelled. Wallet was not charged.');
        setShowRecharge(false);
        return;
      }
      if (checkout.status === 'failed') {
        setError('Wallet recharge failed.');
        return;
      }

      await api.post('/api/wallet/recharge/verify', {
        razorpay_order_id: checkout.response.razorpay_order_id,
        razorpay_payment_id: checkout.response.razorpay_payment_id,
        razorpay_signature: checkout.response.razorpay_signature,
      });
      setShowRecharge(false);
      setMessage('Wallet recharged successfully.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err) || 'Unable to load wallet information.');
    } finally {
      setPaying(false);
    }
  }

  const summaryCards = wallet
    ? [
        {
          label: 'Current Balance',
          value: money(wallet.balance ?? wallet.availableBalance),
          hint: 'Available Balance',
          icon: Wallet,
          valueClass: 'text-emerald-600',
          iconClass: 'bg-emerald-50 text-emerald-600',
        },
        {
          label: "Today's Spend",
          value: money(wallet.todaySpend),
          hint: `${wallet.todayMessages || 0} Messages sent`,
          icon: TrendingUp,
          valueClass: 'text-slate-900',
          iconClass: 'bg-sky-50 text-sky-600',
        },
        {
          label: "This Month's Spend",
          value: money(wallet.monthSpend),
          hint: `${wallet.monthMessages || 0} Messages sent`,
          icon: Calendar,
          valueClass: 'text-slate-900',
          iconClass: 'bg-violet-50 text-violet-600',
        },
        {
          label: 'Pending Deductions',
          value: money(wallet.pendingDeductions),
          hint: `${wallet.pendingMessageCount || 0} Messages`,
          icon: Clock,
          valueClass: 'text-slate-900',
          iconClass: 'bg-amber-50 text-amber-600',
        },
      ]
    : [];

  const txColumns = [
    {
      key: 'id',
      label: 'ID',
      render: (r) => <span className="font-mono text-xs font-bold text-slate-700">TRX{r.id}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => {
        const meta = txTypeMeta(r);
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
              meta.tone === 'ok'
                ? 'bg-emerald-50 text-emerald-700'
                : meta.tone === 'danger'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (r) => {
        const desc = parseTxDescription(r);
        return (
          <div className="min-w-[10rem]">
            <div className="font-semibold text-slate-800">{desc.title}</div>
            {desc.subtitle ? <div className="mt-0.5 text-xs text-slate-400">{desc.subtitle}</div> : null}
          </div>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className={`whitespace-nowrap font-extrabold ${r.type === 'debit' ? 'text-red-500' : 'text-emerald-600'}`}>
          {r.type === 'debit' ? '- ' : '+ '}
          {money(r.amount)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (r) => <span className="whitespace-nowrap text-slate-600">{formatDateTime(r.created_at)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={statusUi(r.status)} />,
    },
  ];

  if (loading && !wallet) {
    return (
      <div className="card min-h-[calc(100vh-11.5rem)]">
        <PageLoader className="min-h-[calc(100vh-11.5rem)]" size="lg" />
      </div>
    );
  }

  const paymentMethods = wallet?.paymentMethods?.length
    ? wallet.paymentMethods
    : [
        { id: 'razorpay', label: 'Razorpay (UPI, Cards, Netbanking)', description: '' },
        { id: 'bank_transfer', label: 'Bank Transfer (Manual)', description: '' },
      ];

  return (
    <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Wallet' }]}>
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      {wallet?.lowBalance ? (
        <div className="notice notice-warn flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Low wallet balance</div>
            <div>Please recharge your wallet. Threshold: {money(wallet.lowWalletThreshold)}.</div>
          </div>
        </div>
      ) : null}

      {/* Top summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{c.label}</div>
                <div className={`mt-2 text-2xl font-extrabold tracking-tight ${c.valueClass}`}>{c.value}</div>
                <div className="mt-1 text-xs text-slate-500">{c.hint}</div>
              </div>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${c.iconClass}`}>
                <c.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle + bottom: chart/transactions | actions/summary/methods */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-extrabold text-slate-900">Balance Overview</div>
              <div className="relative">
                <select
                  className="input !w-auto appearance-none !py-1.5 !pr-8 text-sm font-semibold text-slate-700"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
            <BalanceChart points={history} />
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5">
              <div className="text-base font-extrabold text-slate-900">Recent Transactions</div>
              <Link
                to="/admin/wallet/transactions"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                View All
              </Link>
            </div>
            <DataTable columns={txColumns} rows={recent} empty="No transactions yet." />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 text-base font-extrabold text-slate-900">Quick Actions</div>
            <button
              type="button"
              className="btn btn-primary w-full justify-center"
              onClick={() => setShowRecharge(true)}
            >
              <Plus size={16} /> Recharge Wallet
            </button>
            <div className="mt-3 space-y-2">
              <Link
                to="/admin/wallet/transactions"
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <Receipt size={16} className="text-slate-400" />
                  View Transactions
                </span>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
              <Link
                to="/admin/wallet/recharges"
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <History size={16} className="text-slate-400" />
                  Recharge History
                </span>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 text-base font-extrabold text-slate-900">Wallet Summary</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Total Recharged</span>
                <span className="font-bold text-emerald-600">{money(wallet?.totalRecharged)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Total Spent</span>
                <span className="font-bold text-red-500">{money(wallet?.totalSpent)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Total Deductions (Pending)</span>
                <span className="font-bold text-amber-500">{money(wallet?.pendingDeductions)}</span>
              </div>
              <div className="notice notice-ok !px-3.5 !py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">Available Balance</span>
                  <span className="font-extrabold">{money(wallet?.availableBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 text-base font-extrabold text-slate-900">Payment Methods</div>
            <div className="space-y-2">
              {paymentMethods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {m.id === 'razorpay' ? 'Razorpay (UPI, Cards, Netbanking)' : m.label}
                    </div>
                    {m.description && m.id !== 'razorpay' ? (
                      <div className="mt-0.5 text-xs text-slate-400">{m.description}</div>
                    ) : null}
                  </div>
                  {m.id === 'razorpay' ? (
                    <RazorpayMark />
                  ) : (
                    <Building2 size={18} className="shrink-0 text-slate-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showRecharge ? (
        <Modal
          title="Recharge Wallet"
          subtitle="Add funds to the shared business wallet."
          onClose={() => !paying && setShowRecharge(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" disabled={paying} onClick={() => setShowRecharge(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={paying} onClick={recharge}>
                {paying ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Processing recharge…
                  </>
                ) : (
                  'Continue / Recharge'
                )}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-bold text-slate-700">Amount</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      setPreset(amt);
                    }}
                    className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${
                      !customMode && preset === amt
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className={`rounded-xl border px-2 py-2 text-sm font-extrabold ${
                    customMode ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200'
                  }`}
                >
                  Other
                </button>
              </div>
              {customMode ? (
                <input
                  className="input mt-2"
                  type="number"
                  min={wallet?.minRecharge || 100}
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              ) : (
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 font-extrabold">{money(selectedAmount)}</div>
              )}
            </div>

            <div>
              <div className="mb-2 text-sm font-bold text-slate-700">Payment Method</div>
              <div className="space-y-2">
                <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <input type="radio" checked={payMethod === 'razorpay'} onChange={() => setPayMethod('razorpay')} />
                  <span>
                    <span className="block text-sm font-bold">Razorpay</span>
                    <span className="text-xs text-slate-500">UPI, Cards, Netbanking</span>
                  </span>
                </label>
                <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <input
                    type="radio"
                    checked={payMethod === 'bank_transfer'}
                    onChange={() => setPayMethod('bank_transfer')}
                  />
                  <span>
                    <span className="block text-sm font-bold">Bank Transfer (Manual)</span>
                    <span className="text-xs text-slate-500">No auto-credit — confirmation required</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
