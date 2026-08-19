import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import { PageShell } from '../components/PageShell';
import { StatusBadge, StatCard, PageLoader } from '../components/ui';

function Donut({ segments }) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  let offset = 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 160 160" className="mx-auto h-52 w-52">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#eef2f7" strokeWidth="18" />
      {segments.map((seg) => {
        const len = (seg.value / total) * circumference;
        const el = (
          <circle
            key={seg.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          />
        );
        offset += len;
        return el;
      })}
      <text x="80" y="76" textAnchor="middle" className="fill-slate-900" fontSize="18" fontWeight="800">
        {segments.reduce((s, x) => s + x.value, 0)}
      </text>
      <text x="80" y="96" textAnchor="middle" className="fill-slate-400" fontSize="11" fontWeight="700">
        TOTAL
      </text>
    </svg>
  );
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function load() {
    const { data } = await api.get(`/api/campaigns/${id}`);
    setCampaign(data.data.campaign);
    setMessages(data.data.messages);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
    const socket = getSocket();
    socket.emit('subscribe:campaign', Number(id));
    const onProgress = (payload) => {
      if (String(payload.campaignId) !== String(id)) return;
      setCampaign((c) => (c ? { ...c, ...payload } : c));
    };
    socket.on('campaign:progress', onProgress);
    socket.on('message:status', () => load().catch(() => {}));

    // Fallback polling if socket events are sparse
    const poll = setInterval(() => {
      api
        .get(`/api/campaigns/${id}/progress`)
        .then((res) => {
          setCampaign((c) => (c ? { ...c, ...res.data.data } : c));
        })
        .catch(() => {});
    }, 8000);

    return () => {
      socket.off('campaign:progress', onProgress);
      clearInterval(poll);
    };
  }, [id]);

  async function action(path) {
    setBusy(path);
    setError('');
    try {
      await api.post(`/api/campaigns/${id}/${path}`);
      await load();
      setConfirmCancel(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  }

  const segments = useMemo(() => {
    if (!campaign) return [];
    return [
      { label: 'Sent', value: Number(campaign.sent_count || 0), color: '#3b82f6' },
      { label: 'Delivered', value: Number(campaign.delivered_count || 0), color: '#25d366' },
      { label: 'Read', value: Number(campaign.read_count || 0), color: '#f59e0b' },
      { label: 'Failed', value: Number(campaign.failed_count || 0), color: '#ef4444' },
      { label: 'Pending', value: Number(campaign.pending_count || 0), color: '#94a3b8' },
    ];
  }, [campaign]);

  if (error && !campaign) return <div className="text-red-700">{error}</div>;
  if (!campaign) {
    return (
      <div className="card min-h-[calc(100vh-11.5rem)]">
        <PageLoader className="min-h-[calc(100vh-11.5rem)]" size="lg" />
      </div>
    );
  }

  const done = Number(campaign.total_count || 0) - Number(campaign.pending_count || 0);
  const progress = campaign.total_count
    ? Math.round((done / campaign.total_count) * 100)
    : 0;

  const canPause = ['running', 'queued', 'scheduled'].includes(campaign.status);
  const canResume = campaign.status === 'paused';
  const canLaunchNow = ['draft', 'scheduled'].includes(campaign.status);
  const canApprove = isAdmin && campaign.status === 'pending_approval';
  const canCancel = !['completed', 'cancelled'].includes(campaign.status);
  const canRetry = Number(campaign.failed_count || 0) > 0 && campaign.status !== 'cancelled';

  return (
    <PageShell
      breadcrumb={[
        { label: 'Home', to: '/' },
        { label: 'Campaigns', to: '/campaigns' },
        { label: campaign.name },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {canApprove ? (
            <button
              className="btn btn-primary"
              disabled={!!busy}
              onClick={() =>
                window.confirm('Approve this campaign and launch/schedule it?') && action('approve')
              }
            >
              {busy === 'approve' ? 'Approving…' : 'Approve'}
            </button>
          ) : null}
          {canLaunchNow ? (
            <button
              className="btn btn-primary"
              disabled={!!busy}
              onClick={() =>
                window.confirm(
                  campaign.status === 'scheduled'
                    ? 'Launch this campaign immediately and ignore the scheduled time?'
                    : 'Launch this campaign now?'
                ) && action('send')
              }
            >
              {busy === 'send' ? 'Launching…' : 'Launch Now'}
            </button>
          ) : null}
          {canPause ? (
            <button className="btn btn-secondary" disabled={!!busy} onClick={() => action('pause')}>
              {busy === 'pause' ? 'Pausing…' : 'Pause'}
            </button>
          ) : null}
          {canResume ? (
            <button className="btn btn-primary" disabled={!!busy} onClick={() => action('resume')}>
              {busy === 'resume' ? 'Resuming…' : 'Resume'}
            </button>
          ) : null}
          {canCancel ? (
            <button className="btn btn-danger" disabled={!!busy} onClick={() => setConfirmCancel(true)}>
              Cancel
            </button>
          ) : null}
          {canRetry ? (
            <button className="btn btn-secondary" disabled={!!busy} onClick={() => action('retry-failed')}>
              {busy === 'retry-failed' ? 'Retrying…' : 'Retry Failed Messages'}
            </button>
          ) : null}
        </div>
      }
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {campaign.status === 'pending_approval' ? (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Waiting for admin approval before this campaign can send.
          {isAdmin ? ' Use Approve when ready.' : ''}
        </div>
      ) : null}
      {campaign.status === 'paused' ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Campaign Paused — remaining messages will not send until you resume.
        </div>
      ) : null}

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs font-bold uppercase text-slate-400">Status</div>
          <div className="mt-1">
            <StatusBadge status={campaign.status === 'running' ? 'In Progress' : campaign.status} />
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-400">WhatsApp Number</div>
          <div className="mt-1 font-bold text-slate-800">{campaign.phone_number || '—'}</div>
          <div className="text-xs text-slate-500">{campaign.business_name || ''}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-400">Template</div>
          <div className="mt-1 font-bold text-slate-800">{campaign.template_name || '—'}</div>
          <div className="text-xs text-slate-500">{campaign.language || ''}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-400">Schedule</div>
          <div className="mt-1 font-bold text-slate-800">
            {campaign.scheduled_at
              ? formatWhen(campaign.scheduled_at)
              : campaign.status === 'draft'
                ? 'Draft'
                : 'Immediate'}
          </div>
          <div className="text-xs text-slate-500">
            {campaign.scheduled_timezone || ''} · Created {formatWhen(campaign.created_at)}
          </div>
        </div>
      </div>

      {campaign.description || campaign.campaign_type || campaign.priority || (campaign.tags || []).length || campaign.notes ? (
        <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Type</div>
            <div className="mt-1 font-bold capitalize text-slate-800">
              {campaign.campaign_type || 'marketing'}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Priority</div>
            <div className="mt-1 font-bold capitalize text-slate-800">
              {campaign.priority || 'normal'}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs font-bold uppercase text-slate-400">Tags</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(campaign.tags || []).length ? (
                campaign.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg bg-[#ecfdf5] px-2 py-0.5 text-xs font-bold text-[var(--wa-deep)]"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </div>
          </div>
          {campaign.description ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs font-bold uppercase text-slate-400">Description</div>
              <div className="mt-1 text-sm text-slate-700">{campaign.description}</div>
            </div>
          ) : null}
          {campaign.notes ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-xs font-bold uppercase text-slate-400">Notes</div>
              <div className="mt-1 text-sm text-slate-700">{campaign.notes}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card p-4">
        <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[var(--wa)] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {done.toLocaleString()} of {Number(campaign.total_count || 0).toLocaleString()} processed
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total" value={campaign.total_count} />
        <StatCard label="Sent" value={campaign.sent_count} />
        <StatCard label="Delivered" value={campaign.delivered_count} />
        <StatCard label="Read" value={campaign.read_count} />
        <StatCard label="Failed" value={campaign.failed_count} />
        <StatCard label="Pending" value={campaign.pending_count} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-2 font-extrabold text-slate-900">Delivery Breakdown</div>
          <Donut segments={segments} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <b>{s.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-[var(--line)] px-4 py-3 font-extrabold">Recent Messages</div>
          <div className="max-h-[360px] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-[var(--panel-2)] text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Phone</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Error</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3">{m.phone}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-red-500">{m.error_message || '—'}</td>
                  </tr>
                ))}
                {!messages.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No messages yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmCancel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setConfirmCancel(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-5 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Cancel Campaign?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Remaining messages will not be sent. Messages already sent stay as-is.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmCancel(false)}>
                Keep Campaign
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!!busy}
                onClick={() => action('cancel')}
              >
                {busy === 'cancel' ? 'Cancelling…' : 'Cancel Campaign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
