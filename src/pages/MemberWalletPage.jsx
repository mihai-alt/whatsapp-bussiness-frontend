import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { openRazorpayCheckout } from '../lib/razorpay';
import { useAuth } from '../context/AuthContext';
import { PageShell, DataTable } from '../components/PageShell';
import { StatusBadge } from '../components/ui';

const PRESETS = [500, 1000, 2000, 5000, 10000];

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    processing: 'Processing',
    completed: 'Success',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    success: 'Success',
  };
  return map[String(status || '').toLowerCase()] || status || 'Success';
}

function Modal({ title, subtitle, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div
        className={`relative w-full rounded-2xl border border-[var(--line)] bg-white shadow-xl ${
          wide ? 'max-w-xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
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

export default function MemberWalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [usage, setUsage] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showRecharge, setShowRecharge] = useState(false);
  const [preset, setPreset] = useState(1000);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const [flow, setFlow] = useState(null);
  const [processStep, setProcessStep] = useState(0);
  const [successInfo, setSuccessInfo] = useState(null);
  const [addedHint, setAddedHint] = useState(null);
  const [highlightTxId, setHighlightTxId] = useState(null);

  const minRecharge = Number(wallet?.minRecharge || 100);
  const maxRecharge = Number(wallet?.maxRecharge || 100000);

  const selectedAmount = useMemo(() => {
    if (customMode) {
      const n = Number(customAmount);
      return Number.isFinite(n) ? n : 0;
    }
    return Number(preset);
  }, [customMode, customAmount, preset]);

  const amountError = useMemo(() => {
    if (!showRecharge) return '';
    if (!selectedAmount || selectedAmount <= 0) return 'Enter a positive amount';
    if (selectedAmount < minRecharge) return `Minimum recharge is ${money(minRecharge)}`;
    if (selectedAmount > maxRecharge) return `Maximum recharge is ${money(maxRecharge)}`;
    if (!/^\d+(\.\d{1,2})?$/.test(String(customMode ? customAmount : selectedAmount))) {
      return 'Use up to 2 decimal places only';
    }
    return '';
  }, [showRecharge, selectedAmount, minRecharge, maxRecharge, customMode, customAmount]);

  async function load() {
    const [w, t, u, r] = await Promise.all([
      api.get('/api/wallet'),
      api.get('/api/wallet/transactions', { params: { limit: 50 } }),
      api.get('/api/wallet/usage', { params: { days: 365 } }),
      api.get('/api/wallet/recharges', { params: { limit: 50 } }),
    ]);
    setWallet(w.data.data);
    setTransactions(t.data.data.rows || []);
    setUsage(u.data.data || []);
    setRecharges(r.data.data.rows || []);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

  const totals = useMemo(() => {
    const spent = usage.reduce((s, row) => s + Number(row.spent || 0), 0);
    const added = usage.reduce((s, row) => s + Number(row.credited || 0), 0);
    return { spent, added };
  }, [usage]);

  function openRechargeModal() {
    setError('');
    setMessage('');
    setPreset(1000);
    setCustomMode(false);
    setCustomAmount('');
    setShowRecharge(true);
  }

  function closeRechargeModal() {
    if (paying) return;
    setShowRecharge(false);
  }

  async function proceedToPayment() {
    if (amountError) {
      setError(amountError);
      return;
    }
    if (!wallet?.razorpayConfigured) {
      setError('Razorpay is not configured. Ask an admin to set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.');
      return;
    }

    setPaying(true);
    setError('');
    let orderId = null;

    try {
      const { data } = await api.post('/api/wallet/recharge/create-order', {
        amount: Number(selectedAmount),
      });

      orderId = data.orderId;
      setShowRecharge(false);
      setFlow('processing');
      setProcessStep(0);

      const checkout = await openRazorpayCheckout({
        keyId: data.keyId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'WhatsApp Business BSP',
        description: 'Wallet Recharge',
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        notes: {
          rechargeId: String(data.rechargeId || ''),
        },
      });

      if (checkout.status === 'dismissed') {
        await api.post('/api/wallet/recharge/cancel', {
          razorpay_order_id: orderId,
          reason: 'checkout_dismissed',
        }).catch(() => {});
        setFlow(null);
        setMessage('Payment cancelled. Your wallet was not charged.');
        await load();
        return;
      }

      if (checkout.status === 'failed') {
        setFlow('failed');
        await load();
        return;
      }

      setProcessStep(1);
      const verify = await api.post('/api/wallet/recharge/verify', {
        razorpay_order_id: checkout.response.razorpay_order_id,
        razorpay_payment_id: checkout.response.razorpay_payment_id,
        razorpay_signature: checkout.response.razorpay_signature,
      });

      setProcessStep(2);
      const info = verify.data.data;
      setSuccessInfo({
        amount: info.recharge?.amount ?? selectedAmount,
        paymentId: info.recharge?.razorpay_payment_id,
        orderId: info.recharge?.razorpay_order_id,
        method: info.recharge?.payment_method || 'Razorpay',
        at: info.recharge?.completed_at || new Date().toISOString(),
        balance: info.balance,
      });
      setAddedHint(info.recharge?.amount ?? selectedAmount);
      setFlow('success');
      await load();
      const tx = (await api.get('/api/wallet/transactions', { params: { limit: 5 } })).data.data.rows || [];
      setTransactions(tx);
      if (tx[0]) setHighlightTxId(tx[0].id);
    } catch (err) {
      if (orderId) {
        await api.post('/api/wallet/recharge/cancel', {
          razorpay_order_id: orderId,
          reason: 'client_error',
        }).catch(() => {});
      }
      setError(getErrorMessage(err));
      setFlow('failed');
    } finally {
      setPaying(false);
    }
  }

  if (!wallet) {
    return <div className="card p-10 text-center text-slate-500">Loading wallet...</div>;
  }

  const txColumns = [
    {
      key: 'type',
      label: 'Type',
      render: (r) => (
        <span className={`font-extrabold ${r.type === 'debit' ? 'text-red-500' : 'text-emerald-600'}`}>
          {r.type === 'debit' ? 'Debit' : r.type === 'credit' ? 'Credit' : r.type}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className={`font-extrabold ${r.type === 'debit' ? 'text-red-500' : 'text-emerald-600'}`}>
          {r.type === 'debit' ? '- ' : '+ '}
          {money(r.amount)}
        </span>
      ),
    },
    { key: 'description', label: 'Description', render: (r) => r.description || '—' },
    {
      key: 'balance_after',
      label: 'Balance',
      render: (r) => money(r.balance_after),
    },
    { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={statusLabel(r.status || 'success')} />,
    },
  ];

  const rechargeColumns = [
    { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.completed_at || r.created_at) },
    { key: 'amount', label: 'Recharge Amount', render: (r) => money(r.amount) },
    { key: 'payment_method', label: 'Payment Method', render: (r) => r.payment_method || r.gateway || '—' },
    {
      key: 'razorpay_order_id',
      label: 'Order ID',
      render: (r) => r.razorpay_order_id || r.gateway_ref || '—',
    },
    {
      key: 'razorpay_payment_id',
      label: 'Payment ID',
      render: (r) => r.razorpay_payment_id || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={statusLabel(r.status)} />,
    },
  ];

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Wallet' }]}
      actions={
        <button type="button" className="btn btn-primary" onClick={openRechargeModal}>
          <Plus size={16} /> Recharge Wallet
        </button>
      }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Current Balance</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{money(wallet.balance)}</div>
          {addedHint ? (
            <div className="mt-1 text-sm font-semibold text-emerald-600">+ {money(addedHint)} added</div>
          ) : null}
        </div>
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Spent</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{money(totals.spent)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Added</div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">{money(totals.added)}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-3 font-extrabold">Transaction History</div>
        <DataTable
          columns={txColumns}
          rows={transactions}
          empty="No transactions yet."
          rowClassName={(r) => (r.id === highlightTxId ? 'bg-emerald-50/80' : undefined)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-3 font-extrabold">Recharge History</div>
        <DataTable columns={rechargeColumns} rows={recharges} empty="No recharges yet." />
      </div>

      {showRecharge ? (
        <Modal
          title="Recharge Wallet"
          subtitle="Add money to your wallet to send WhatsApp messages and campaigns."
          onClose={closeRechargeModal}
          wide
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={closeRechargeModal} disabled={paying}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={proceedToPayment}
                disabled={paying || Boolean(amountError)}
              >
                {paying ? 'Please wait…' : 'Proceed to Payment →'}
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-bold text-slate-700">Choose Amount</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((amt) => {
                  const selected = !customMode && preset === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setCustomMode(false);
                        setPreset(amt);
                      }}
                      className={`relative rounded-xl border px-3 py-3 text-sm font-extrabold transition ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {selected ? (
                        <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      ) : null}
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className={`rounded-xl border px-3 py-3 text-sm font-extrabold transition ${
                    customMode
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Amount to Add</label>
              {customMode ? (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    className="input pl-8"
                    type="number"
                    min={minRecharge}
                    max={maxRecharge}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-extrabold text-slate-900">
                  {money(selectedAmount)}
                </div>
              )}
              {amountError ? <p className="mt-1 text-sm text-red-600">{amountError}</p> : null}
              <p className="mt-2 text-sm font-medium text-emerald-600">
                + You will be redirected to Razorpay for secure payment.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-sm font-extrabold text-slate-800">Order Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recharge Amount</span>
                  <span className="font-bold text-slate-800">{money(selectedAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Processing Fee</span>
                  <span className="font-bold text-slate-800">{money(0)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                  <span className="font-extrabold text-slate-900">Total Payable</span>
                  <span className="font-extrabold text-slate-900">{money(selectedAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {flow === 'processing' ? (
        <Modal title="Payment Processing..." onClose={null}>
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Loader2 className="animate-spin" size={28} />
            </div>
            <p className="text-sm text-slate-500">Please do not close this window. This may take a few seconds.</p>
            <ul className="mx-auto max-w-xs space-y-2 text-left text-sm">
              {['Payment initiated', 'Verifying payment', 'Updating wallet balance'].map((label, idx) => (
                <li key={label} className="flex items-center gap-2">
                  {processStep > idx ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : processStep === idx ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-slate-200" />
                  )}
                  <span className={processStep >= idx ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      ) : null}

      {flow === 'success' && successInfo ? (
        <Modal
          title="Payment Successful!"
          subtitle="Your wallet has been recharged successfully."
          onClose={() => setFlow(null)}
          footer={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFlow(null);
                setTimeout(() => setAddedHint(null), 8000);
              }}
            >
              Back to Wallet
            </button>
          }
        >
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Recharge Amount</span>
              <span className="font-extrabold">{money(successInfo.amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Payment ID</span>
              <span className="truncate font-mono text-xs font-bold">{successInfo.paymentId}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Order ID</span>
              <span className="truncate font-mono text-xs font-bold">{successInfo.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method</span>
              <span className="font-bold">{successInfo.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time</span>
              <span className="font-bold">{formatDateTime(successInfo.at)}</span>
            </div>
          </div>
        </Modal>
      ) : null}

      {flow === 'failed' ? (
        <Modal
          title="Payment Failed"
          subtitle="Your payment could not be completed."
          onClose={() => setFlow(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setFlow(null)}>
                Back to Wallet
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFlow(null);
                  openRechargeModal();
                }}
              >
                Try Again
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            No money was added to your wallet. You can try again with the same or a different amount.
          </p>
        </Modal>
      ) : null}
    </PageShell>
  );
}
