export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  let cls = 'badge-muted';
  let label = status;
  if (['approved', 'connected', 'completed', 'delivered', 'read', 'sent', 'ok', 'in progress'].includes(s) || s === 'running') {
    cls = s === 'running' || s === 'in progress' ? 'badge-warn' : 'badge-ok';
  } else if (['pending', 'queued', 'scheduled', 'paused', 'draft', 'pending_approval'].includes(s)) {
    cls = 'badge-warn';
  } else if (['rejected', 'failed', 'cancelled', 'disconnected', 'error'].includes(s)) {
    cls = 'badge-danger';
  } else if (s === 'info') {
    cls = 'badge-info';
  }
  if (s === 'running') label = 'In Progress';
  if (s === 'pending_approval') label = 'Pending Approval';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--faint)]">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--ink)]">{value}</div>
      {hint ? <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}

export function PageLoader({ className = '', size = 'md' }) {
  return (
    <div
      className={`grid place-items-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div
        className={`orbit-loader ${size === 'sm' ? 'orbit-loader--sm' : ''} ${
          size === 'lg' ? 'orbit-loader--lg' : ''
        }`}
        aria-hidden="true"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="orbit-loader__dot" style={{ '--i': i }} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel-2)] p-8 text-center text-[var(--muted)]">
      <div className="font-bold text-[var(--ink)]">{title}</div>
      {body ? <p className="mt-2 text-sm">{body}</p> : null}
    </div>
  );
}
