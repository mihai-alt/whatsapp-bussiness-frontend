import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, Eye, Pause, Play, Plus, Rocket, RotateCcw, Send, XCircle } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageShell, IconAction } from '../components/PageShell';
import { StatusBadge } from '../components/ui';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  return d.toLocaleString();
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await api.get('/api/campaigns');
    setCampaigns(data.data || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [load]);

  useWorkspaceRealtime(['campaigns'], () =>
    load().catch((err) => setError(getErrorMessage(err)))
  );

  async function runAction(id, action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      await api.post(`/api/campaigns/${id}/${action}`);
      await load();
      setMessage(`Campaign ${action} successful`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageShell
      breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Campaigns' }]}
    >
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
      ) : null}

      <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
          <table className="min-w-full flex-1 text-sm">
            <thead className="bg-[var(--panel-2)] text-left text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-bold whitespace-nowrap">Campaign Name</th>
                <th className="px-5 py-3.5 font-bold whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 font-bold whitespace-nowrap">Created At</th>
                <th className="px-5 py-3.5 font-bold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="h-full">
              {loading ? (
                <tr className="h-full">
                  <td colSpan={4} className="px-5 text-center text-slate-400 align-middle">
                    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center">
                      Loading campaigns…
                    </div>
                  </td>
                </tr>
              ) : campaigns.length ? (
                campaigns.map((r) => {
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} className="border-t border-[var(--line)] hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 align-middle">
                        <Link
                          className="font-bold text-slate-800 hover:text-[var(--wa-deep)]"
                          to={`/campaigns/${r.id}`}
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <StatusBadge status={r.status === 'running' ? 'In Progress' : r.status} />
                      </td>
                      <td className="px-5 py-3.5 align-middle text-slate-600">
                        {formatWhen(r.created_at)}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex flex-wrap items-center gap-1">
                          <IconAction title="View" onClick={() => navigate(`/campaigns/${r.id}`)}>
                            <Eye size={14} />
                          </IconAction>
                          {r.status === 'pending_approval' && isAdmin ? (
                            <IconAction
                              title="Approve"
                              disabled={busy}
                              onClick={() =>
                                runAction(
                                  r.id,
                                  'approve',
                                  'Approve this campaign and launch/schedule it?'
                                )
                              }
                            >
                              <Check size={14} />
                            </IconAction>
                          ) : null}
                          {['draft', 'scheduled'].includes(r.status) ? (
                            <IconAction
                              title="Launch now"
                              disabled={busy}
                              onClick={() =>
                                runAction(
                                  r.id,
                                  'send',
                                  r.status === 'scheduled'
                                    ? 'Launch this campaign immediately and ignore the scheduled time?'
                                    : 'Launch this campaign now?'
                                )
                              }
                            >
                              <Rocket size={14} />
                            </IconAction>
                          ) : null}
                          {['running', 'queued', 'scheduled'].includes(r.status) ? (
                            <IconAction
                              title="Pause"
                              disabled={busy}
                              onClick={() => runAction(r.id, 'pause')}
                            >
                              <Pause size={14} />
                            </IconAction>
                          ) : null}
                          {r.status === 'paused' ? (
                            <IconAction
                              title="Resume"
                              disabled={busy}
                              onClick={() => runAction(r.id, 'resume')}
                            >
                              <Play size={14} />
                            </IconAction>
                          ) : null}
                          {!['completed', 'cancelled'].includes(r.status) ? (
                            <IconAction
                              title="Cancel"
                              disabled={busy}
                              onClick={() =>
                                runAction(
                                  r.id,
                                  'cancel',
                                  'Cancel Campaign?\n\nRemaining messages will not be sent.'
                                )
                              }
                            >
                              <XCircle size={14} />
                            </IconAction>
                          ) : null}
                          {Number(r.failed_count) > 0 && r.status !== 'cancelled' ? (
                            <IconAction
                              title="Retry Failed"
                              disabled={busy}
                              onClick={() => runAction(r.id, 'retry-failed')}
                            >
                              <RotateCcw size={14} />
                            </IconAction>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="h-full">
                  <td colSpan={4} className="px-5 align-middle">
                    <div className="flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center text-center">
                      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
                        <Send size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
                      </div>
                      <div className="text-base font-extrabold text-slate-900">No campaigns yet.</div>
                      <p className="mt-1.5 text-sm text-slate-500">
                        Create your first WhatsApp campaign.
                      </p>
                      <Link to="/campaigns/new" className="btn btn-primary mt-5 inline-flex">
                        <Plus size={16} /> Create Campaign
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
