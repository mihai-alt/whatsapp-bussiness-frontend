import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { History } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/PageShell';
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

function statusLabel(status) {
  const map = {
    pending: 'Pending',
    processing: 'Pending',
    completed: 'Success',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return map[String(status || '').toLowerCase()] || status || '—';
}

export default function AdminWalletRechargesPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(p = 1) {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/wallet/recharges', {
        params: { page: p, limit: 25 },
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
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/wallet" replace />;

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <PageShell
      breadcrumb={[
        { label: 'Home', to: '/' },
        { label: 'Wallet', to: '/admin/wallet' },
        { label: 'Recharge History' },
      ]}
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Loading recharge history…
          </div>
        ) : !rows.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
              <History size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
            </div>
            <div className="text-base font-extrabold text-slate-900">No recharge history yet.</div>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              Wallet recharges will appear here once payments are completed.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f8fafc] text-left text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Recharge ID</th>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Amount</th>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Payment Method</th>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Payment Reference</th>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Performed By</th>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Date</th>
                    <th className="px-5 py-3.5 font-bold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--line)] hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 align-middle">
                        <span className="font-mono text-xs font-bold">RCH{r.id}</span>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className="font-extrabold text-emerald-600">{money(r.amount)}</span>
                      </td>
                      <td className="px-5 py-3.5 align-middle text-slate-600">
                        {r.payment_method || r.gateway || '—'}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-slate-600">
                        {r.razorpay_payment_id || r.razorpay_order_id || r.gateway_ref || '—'}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-slate-600">
                        {r.performed_by_name || r.performed_by_email || '—'}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-slate-600">
                        {formatDateTime(r.completed_at || r.created_at)}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <StatusBadge status={statusLabel(r.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
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
    </PageShell>
  );
}
