import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Receipt, Search } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Breadcrumb } from '../components/PageShell';
import { StatusBadge } from '../components/ui';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  });
}

function typeLabel(row) {
  if (row.reference_type === 'recharge' || row.reference_type === 'admin_credit') return 'Recharge';
  if (row.reference_type === 'campaign_message') return 'Message Deduction';
  if (row.type === 'refund') return 'Refund';
  if (row.type === 'debit') return 'Message Deduction';
  return 'Adjustment';
}

export default function AdminWalletTransactionsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(p = 1) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/wallet/transactions', {
        params: {
          page: p,
          limit: 25,
          search: search || undefined,
          referenceType: referenceType || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setRows(data.data.rows || []);
      setTotal(data.data.total || 0);
      setPage(data.data.page || p);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/wallet" replace />;

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-3 overflow-hidden">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Wallet', to: '/admin/wallet' },
          { label: 'Transactions' },
        ]}
      />

      {error ? (
        <div className="shrink-0 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Filters — matches sample: inputs row + Apply below */}
      <div className="card shrink-0 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="relative col-span-2 sm:col-span-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input input-with-icon !py-2.5"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load(1);
              }}
            />
          </div>
          <select
            className="input !py-2.5"
            value={referenceType}
            onChange={(e) => setReferenceType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="recharge">Recharge</option>
            <option value="campaign_message">Message Deduction</option>
            <option value="admin_credit">Manual Credit</option>
          </select>
          <select
            className="input !py-2.5"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <input
            className="input !py-2.5"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            className="input !py-2.5"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-primary !py-2.5 min-w-[120px]"
            onClick={() => load(1)}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Table fills remaining viewport — internal scroll only */}
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-[var(--line)] px-5 py-2.5 font-extrabold">
          Transactions {loading ? '' : `(${total})`}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Loading transactions…
          </div>
        ) : !rows.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
              <Receipt size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
            </div>
            <div className="text-base font-extrabold text-slate-900">No transactions yet.</div>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Wallet credits, recharges, and message deductions will show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[#f8fafc] text-left text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">ID</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Type</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Description</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Amount</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Balance</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Performed By</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Date</th>
                    <th className="px-5 py-3 font-bold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--line)] hover:bg-slate-50/70">
                      <td className="px-5 py-3 align-middle">
                        <span className="font-mono text-xs font-bold">TRX{r.id}</span>
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <span className="font-bold">{typeLabel(r)}</span>
                      </td>
                      <td className="px-5 py-3 align-middle text-slate-600">
                        {r.description || '—'}
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <span
                          className={`font-extrabold ${
                            r.type === 'debit' ? 'text-red-500' : 'text-emerald-600'
                          }`}
                        >
                          {r.type === 'debit' ? '- ' : '+ '}
                          {money(r.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <span className="text-xs text-slate-500">
                          {r.balance_before != null ? `${money(r.balance_before)} → ` : ''}
                          {money(r.balance_after)}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-middle text-slate-600">
                        {r.performed_by_name || r.performed_by_email || '—'}
                      </td>
                      <td className="px-5 py-3 align-middle text-slate-600">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <StatusBadge status={r.status === 'success' ? 'Success' : r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-[var(--line)] px-5 py-2.5">
              <button
                type="button"
                className="btn btn-secondary !py-1.5"
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                Previous
              </button>
              <div className="text-sm text-slate-500">
                Page {page} / {totalPages}
              </div>
              <button
                type="button"
                className="btn btn-secondary !py-1.5"
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
