import { formatCount, formatPct } from './reportUtils';

export function ReportKpiCard({ label, value, hint, delta, icon, accent = '#3b82f6' }) {
  const deltaNum = Number(delta);
  const showDelta = Number.isFinite(deltaNum) && delta !== undefined && delta !== null;
  const up = deltaNum >= 0;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--faint)]">{label}</div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
            {typeof value === 'number' ? formatCount(value) : value}
          </div>
          {hint ? <div className="mt-1 text-xs font-semibold text-[var(--muted)]">{hint}</div> : null}
          {showDelta ? (
            <div className={`mt-1 text-xs font-bold ${up ? 'text-emerald-500' : 'text-red-500'}`}>
              {up ? '↑' : '↓'} {formatPct(Math.abs(deltaNum))} from previous period
            </div>
          ) : null}
        </div>
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return <div className="h-[108px] animate-pulse rounded-xl border border-[var(--line)] bg-[var(--panel-2)]" />;
}
