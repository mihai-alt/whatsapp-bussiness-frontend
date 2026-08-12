export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  let cls = 'badge-muted';
  let label = status;
  if (['approved', 'connected', 'completed', 'delivered', 'read', 'sent', 'ok', 'in progress'].includes(s) || s === 'running') {
    cls = s === 'running' || s === 'in progress' ? 'badge-warn' : 'badge-ok';
  } else if (['pending', 'queued', 'scheduled', 'paused', 'draft'].includes(s)) {
    cls = 'badge-warn';
  } else if (['rejected', 'failed', 'cancelled', 'disconnected', 'error'].includes(s)) {
    cls = 'badge-danger';
  } else if (s === 'info') {
    cls = 'badge-info';
  }
  if (s === 'running') label = 'In Progress';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
      <div className="font-bold text-slate-800">{title}</div>
      {body ? <p className="mt-2 text-sm">{body}</p> : null}
    </div>
  );
}
