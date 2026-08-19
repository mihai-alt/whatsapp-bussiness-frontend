import { Link } from 'react-router';
import {
  Phone,
  Store,
  Wallet,
  ShieldCheck,
  Send,
  CheckCheck,
  Eye,
  XCircle,
  Clock3,
  Megaphone,
  Users,
  FileText,
  PlusCircle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboard, queryKeys } from '../lib/queries';
import { EmptyState, StatusBadge, PageLoader } from '../components/ui';
import { PageShell } from '../components/PageShell';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';

function Sparkline({ color = '#25d366' }) {
  return (
    <svg viewBox="0 0 120 36" className="mt-3 h-9 w-full">
      <path d="M0 28 C20 26, 28 18, 40 20 S60 30, 75 16 S100 8, 120 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M0 28 C20 26, 28 18, 40 20 S60 30, 75 16 S100 8, 120 12 V36 H0 Z" fill={color} opacity="0.12" />
    </svg>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboard,
    retry: 2,
  });

  useWorkspaceRealtime(['campaigns', 'contacts', 'groups', 'wallet'], () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  });

  if (!data) {
    if (error) {
      return (
        <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-[var(--muted)]">Could not load dashboard. Please try again.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      );
    }
    return (
      <div className="card min-h-[calc(100vh-11.5rem)]">
        <PageLoader className="min-h-[calc(100vh-11.5rem)]" size="lg" />
      </div>
    );
  }

  const account = data?.primaryAccount;
  const quality = account?.quality_rating || '—';
  const today = data?.today || {};
  const recentCampaigns = Array.isArray(data?.recentCampaigns) ? data.recentCampaigns : [];
  const metrics = [
    { label: 'Sent', value: today.sent, icon: Send, color: '#3b82f6' },
    { label: 'Delivered', value: today.delivered, icon: CheckCheck, color: '#25d366' },
    { label: 'Read', value: today.read, icon: Eye, color: '#f59e0b' },
    { label: 'Failed', value: today.failed, icon: XCircle, color: '#ef4444' },
    { label: 'Pending', value: today.pending, icon: Clock3, color: '#94a3b8' },
  ];

  return (
    <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Dashboard' }]}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Connected Number</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">{account?.phone_number || 'Not connected'}</div>
              <div className="mt-2">{account ? <StatusBadge status="Connected" /> : <StatusBadge status="Disconnected" />}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf0] text-[var(--wa-deep)]"><Phone size={18} /></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Business Name</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">{account?.business_name || 'Your Business'}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef6ff] text-blue-600"><Store size={18} /></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Wallet Balance</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">₹{Number(data.wallet?.balance || 0).toFixed(2)}</div>
              <Link to="/wallet" className="btn btn-wa-soft mt-3 !py-1.5 !px-3 text-xs">Add Money</Link>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff7e8] text-amber-600"><Wallet size={18} /></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Quality Rating</div>
              <div className="mt-2 text-lg font-extrabold text-emerald-600">{quality}</div>
              <div className="mt-2 text-xs text-slate-500">{account?.messaging_limit ? `Limit: ${account.messaging_limit}` : 'High Quality'}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf0] text-[var(--wa-deep)]"><ShieldCheck size={18} /></div>
          </div>
          <Sparkline />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-3 font-extrabold text-slate-800">Today's Messaging</div>
        <div className="grid grid-cols-2 md:grid-cols-5">
          {metrics.map((m, idx) => {
            const MetricIcon = m.icon;
            return (
              <div key={m.label} className={`relative p-4 ${idx < metrics.length - 1 ? 'md:border-r border-[var(--line)]' : ''}`}>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  {MetricIcon ? <MetricIcon size={14} style={{ color: m.color }} /> : null}
                  {m.label}
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{m.value ?? 0}</div>
                <div className="mt-3 h-1 rounded-full" style={{ background: m.color }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <div className="font-extrabold text-slate-800">Recent Campaigns</div>
          <Link to="/campaigns" className="text-sm font-bold text-[var(--wa-deep)]">View All</Link>
        </div>
        {recentCampaigns.length === 0 ? (
          <div className="p-5"><EmptyState title="No campaigns yet" body="Create a campaign to start bulk messaging." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-2)] text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Campaign Name</th>
                  <th className="px-4 py-3 font-bold">Sent</th>
                  <th className="px-4 py-3 font-bold">Delivered</th>
                  <th className="px-4 py-3 font-bold">Read</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Created On</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--line)] hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link className="font-bold text-slate-800 hover:text-[var(--wa-deep)]" to={`/campaigns/${c.id}`}>{c.name}</Link>
                    </td>
                    <td className="px-4 py-3">{c.sent_count}</td>
                    <td className="px-4 py-3">{c.delivered_count}</td>
                    <td className="px-4 py-3">{c.read_count}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status === 'running' ? 'In Progress' : c.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{c.created_at ? String(c.created_at).slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { to: '/campaigns/new', title: 'Create Campaign', desc: 'Send bulk template messages', icon: Megaphone, tone: 'bg-[#e8faf0] text-[var(--wa-deep)]' },
          { to: '/contacts', title: 'Add Contacts', desc: 'Import CSV or add manually', icon: Users, tone: 'bg-[#eef6ff] text-blue-600' },
          { to: '/templates', title: 'Create Template', desc: 'Submit for Meta approval', icon: FileText, tone: 'bg-[#f5f0ff] text-violet-600' },
          { to: '/wallet', title: 'Add Money', desc: 'Recharge wallet balance', icon: PlusCircle, tone: 'bg-[#fff7e8] text-amber-600' },
        ].map((a) => {
          const ActionIcon = a.icon;
          return (
            <Link key={a.title} to={a.to} className="card p-4 hover:shadow-md transition flex items-center gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${a.tone}`}>
                {ActionIcon ? <ActionIcon size={18} /> : null}
              </div>
              <div>
                <div className="font-extrabold text-slate-900">{a.title}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
