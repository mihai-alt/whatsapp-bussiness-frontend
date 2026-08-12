import { useEffect, useState } from 'react';
import {
  Check,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Unplug,
  X,
} from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageShell, DataTable, IconAction } from '../components/PageShell';
import { StatusBadge } from '../components/ui';
import { useMetaEmbeddedSignup } from '../hooks/useMetaEmbeddedSignup';

function MetaMark({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 2C9.7 2 3 8.2 3 15.9c0 4.4 2.2 8.3 5.6 10.9V34l5.1-2.8c1.4.4 2.8.6 4.3.6 8.3 0 15-6.2 15-13.9S26.3 2 18 2zm1.5 18.7-3.8-4.1-7.4 4.1 8.1-8.6 3.9 4.1 7.3-4.1-8.1 8.6z"
      />
    </svg>
  );
}

function qualityClass(value) {
  const v = String(value || '').toUpperCase();
  if (v === 'GREEN' || v === 'HIGH') return 'text-emerald-600 font-bold';
  if (v === 'YELLOW' || v === 'MEDIUM') return 'text-amber-600 font-bold';
  if (v === 'RED' || v === 'LOW') return 'text-red-600 font-bold';
  return 'text-slate-700 font-semibold';
}

const SETUP_STEPS = [
  'Verifying your account',
  'Retrieving WhatsApp Business Account',
  'Getting phone number details',
  'Saving connection',
];

function ConnectFlow({ open, onClose, metaConfig, signup }) {
  if (!open) return null;

  const { phase, error, result, progressStep, busy, setPhase, connect, reset } = signup;

  if (phase === 'success' && result) {
    return (
      <div className="card mx-auto max-w-xl space-y-5 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check size={32} strokeWidth={3} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Connected Successfully!</h2>
          <p className="mt-2 text-sm text-slate-500">
            WhatsApp Business number connected successfully. Details were retrieved from Meta automatically.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-slate-50 p-4 text-left">
          <div className="text-2xl font-extrabold text-[var(--wa-deep)]">
            {result.phoneNumber || result.phone_number || '—'}
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Business Name</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">
                {result.businessName || result.business_name || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge status={result.connectionStatus || result.status || 'connected'} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">WABA ID</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">{result.wabaId || result.waba_id}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone Number ID</dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-700">
                {result.phoneNumberId || result.phone_number_id}
              </dd>
            </div>
          </dl>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full justify-center"
          onClick={() => {
            reset();
            onClose(true);
          }}
        >
          Go to Connected Numbers
        </button>
      </div>
    );
  }

  if (phase === 'redirecting' || phase === 'completing') {
    return (
      <div className="card mx-auto max-w-lg space-y-5 p-8 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#1877F2]" />
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            {phase === 'redirecting' ? 'Connecting to Meta...' : 'Completing Setup'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {phase === 'redirecting'
              ? 'You will be redirected to Meta to securely connect your WhatsApp Business account.'
              : 'Retrieving WABA, phone number, and business details from Meta Graph API.'}
          </p>
        </div>
        {phase === 'completing' ? (
          <ul className="space-y-2 text-left text-sm">
            {SETUP_STEPS.map((label, idx) => {
              const done = progressStep > idx;
              const active = progressStep === idx;
              return (
                <li key={label} className="flex items-center gap-2 text-slate-700">
                  {done ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1877F2]" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-slate-300" />
                  )}
                  <span className={done ? 'font-semibold text-emerald-800' : ''}>{label}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-left text-sm text-sky-900">
            Make sure you are logged in to the correct Meta account.
          </div>
        )}
      </div>
    );
  }

  // intro / error
  return (
    <div className="card mx-auto max-w-xl space-y-5 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {phase === 'error' ? 'Retry connection' : 'Step 1 of 4'}
          </div>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Connect WhatsApp Business</h2>
          <p className="mt-2 text-sm text-slate-500">
            Connect your WhatsApp Business number through Meta&apos;s official onboarding process.
          </p>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-700"
          onClick={() => {
            reset();
            onClose(false);
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <ul className="space-y-2 text-sm text-slate-700">
        {[
          'Official Meta secure connection',
          'No coding or manual ID entry required',
          'Works with WhatsApp Cloud API',
          'Connect any approved WhatsApp Business number',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {!metaConfig?.canLaunchSignup && !metaConfig?.embeddedSignupEnabled ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="font-bold">Meta Developer setup required</div>
          <p className="mt-1">
            Add <code className="font-mono">META_APP_ID</code>, <code className="font-mono">META_APP_SECRET</code>, and{' '}
            <code className="font-mono">META_CONFIG_ID</code> to <code className="font-mono">backend/.env</code>, then
            restart the API. See <code className="font-mono">docs/META_SETUP.md</code>.
          </p>
        </div>
      ) : null}

      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <button
        type="button"
        className="btn w-full justify-center bg-[#1877F2] py-3 text-base text-white hover:bg-[#166fe5]"
        disabled={busy}
        onClick={() => connect(metaConfig)}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MetaMark className="h-5 w-5" />}
        Continue with Meta
      </button>

      <p className="text-center text-xs text-slate-400">
        By continuing, you agree to Meta&apos;s Business Tools Terms. Access tokens stay on the server only.
      </p>
    </div>
  );
}

export default function WhatsAppPage() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [metaConfig, setMetaConfig] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const signup = useMetaEmbeddedSignup();

  async function load() {
    const [a, c] = await Promise.all([
      api.get('/api/numbers'),
      api.get('/api/meta/embedded-signup'),
    ]);
    setAccounts(a.data.data || a.data.numbers || []);
    setMetaConfig(c.data.data);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function refresh(id) {
    setError('');
    try {
      await api.post(`/api/numbers/${id}/refresh`);
      setMessage('Number details refreshed from Meta');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function disconnect(id) {
    if (
      !confirm(
        'Disconnect WhatsApp Business Number?\n\nThis removes this dashboard’s connection until you reconnect via Meta.'
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.delete(`/api/numbers/${id}`);
      setMessage('Number disconnected');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function openConnect() {
    signup.reset();
    signup.setPhase('intro');
    setShowConnect(true);
    setMessage('');
    setError('');
    try {
      const { data: res } = await api.get('/api/meta/embedded-signup');
      setMetaConfig(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function closeConnect(refreshList) {
    setShowConnect(false);
    signup.reset();
    if (refreshList) {
      load().catch((err) => setError(getErrorMessage(err)));
      setMessage('WhatsApp Business number connected successfully.');
    }
  }

  const columns = [
    {
      key: 'phone_number',
      label: 'Phone Number',
      render: (r) => (
        <span className="font-bold text-slate-800">{r.phoneNumber || r.phone_number || '—'}</span>
      ),
    },
    {
      key: 'business_name',
      label: 'Business Name',
      render: (r) => r.businessName || r.business_name || '—',
    },
    {
      key: 'waba_id',
      label: 'WABA ID',
      render: (r) => <span className="font-mono text-xs">{r.wabaId || r.waba_id}</span>,
    },
    {
      key: 'phone_number_id',
      label: 'Phone Number ID',
      render: (r) => (
        <span className="font-mono text-xs text-slate-500">{r.phoneNumberId || r.phone_number_id}</span>
      ),
    },
    {
      key: 'quality_rating',
      label: 'Quality Rating',
      render: (r) => (
        <span className={qualityClass(r.qualityRating || r.quality_rating)}>
          {r.qualityRating || r.quality_rating || '—'}
        </span>
      ),
    },
    {
      key: 'messaging_limit',
      label: 'Messaging Limit',
      render: (r) => r.messagingLimit || r.messaging_limit || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.connectionStatus || r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) =>
        isAdmin && (r.connectionStatus || r.status) === 'connected' ? (
          <div className="flex gap-1.5">
            <IconAction title="Refresh" onClick={() => refresh(r.id)}>
              <RefreshCw size={14} />
            </IconAction>
            <IconAction title="Disconnect" danger onClick={() => disconnect(r.id)}>
              <Unplug size={14} />
            </IconAction>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  const emptyState = (
    <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
        <MessageCircle size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
      </div>
      <div className="text-base font-extrabold text-slate-900">No WhatsApp numbers connected yet.</div>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Connect your WhatsApp Business number through Meta&apos;s official onboarding.
      </p>
      {isAdmin ? (
        <button type="button" className="btn btn-primary mt-5" onClick={openConnect}>
          <Link2 size={16} /> Connect with Meta
        </button>
      ) : null}
    </div>
  );

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Connected Numbers' }]}
      // actions={
      //   !showConnect && isAdmin ? (
      //     <button type="button" className="btn btn-primary" onClick={openConnect}>
      //       <Link2 size={16} /> Connect with Meta
      //     </button>
      //   ) : null
      // }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      {showConnect && isAdmin ? (
        <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col items-center justify-center overflow-hidden p-4">
          <ConnectFlow open={showConnect} onClose={closeConnect} metaConfig={metaConfig} signup={signup} />
        </div>
      ) : (
        <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden">
          {!accounts.length ? (
            emptyState
          ) : (
            <>
              <div className="flex-1 overflow-x-auto">
                <DataTable columns={columns} rows={accounts} empty="No numbers." />
              </div>
              <div className="flex items-start gap-3 border-t border-[var(--line)] bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p>
                  Your numbers are connected securely via Meta. Phone, WABA, and business details are
                  retrieved automatically after onboarding — tokens never appear in the browser.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </PageShell>
  );
}
