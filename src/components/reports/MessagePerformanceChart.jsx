import { formatCount } from './reportUtils';

const SERIES = [
  { key: 'sent', label: 'Sent', color: '#3b82f6' },
  { key: 'delivered', label: 'Delivered', color: '#25d366' },
  { key: 'read', label: 'Read', color: '#8b5cf6' },
  { key: 'failed', label: 'Failed', color: '#ef4444' },
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
];

export function MessagePerformanceChart({ points = [], groupBy = 'day', onGroupBy, loading, error, onRetry }) {
  const w = 720;
  const h = 280;
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const rows = Array.isArray(points) ? points : [];
  const max = Math.max(1, ...rows.flatMap((p) => SERIES.map((s) => Number(p[s.key] || 0))));

  function coords(key) {
    if (!rows.length) return '';
    return rows
      .map((p, i) => {
        const x = pad.l + (i * (w - pad.l - pad.r)) / Math.max(rows.length - 1, 1);
        const y = pad.t + ((max - Number(p[key] || 0)) / max) * (h - pad.t - pad.b);
        return `${x},${y}`;
      })
      .join(' ');
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="font-extrabold text-[var(--ink)]">Message Performance</div>
        <select
          className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm font-bold text-[var(--ink)]"
          value={groupBy}
          onChange={(e) => onGroupBy?.(e.target.value)}
        >
          <option value="hour">Hourly</option>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
        </select>
      </div>
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-[var(--panel-2)]" />
      ) : error ? (
        <div className="grid h-64 place-items-center text-center text-sm text-[var(--muted)]">
          <div>
            <div>Unable to load report data. Please try again.</div>
            <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      ) : !rows.length ? (
        <div className="grid h-64 place-items-center text-sm text-[var(--muted)]">
          No data found for the selected filters.
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} className="h-64 w-full">
            {[0, 1, 2, 3, 4].map((i) => {
              const y = pad.t + i * ((h - pad.t - pad.b) / 4);
              const val = Math.round(max - (i * max) / 4);
              return (
                <g key={i}>
                  <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--line)" />
                  <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--faint)">
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val}
                  </text>
                </g>
              );
            })}
            {SERIES.map((s) => (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                points={coords(s.key)}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {rows.map((p, i) => {
              const x = pad.l + (i * (w - pad.l - pad.r)) / Math.max(rows.length - 1, 1);
              const label = String(p.date || '').slice(groupBy === 'hour' ? 11 : 5, groupBy === 'hour' ? 16 : 10);
              return (
                <text key={`${p.date}-${i}`} x={x} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--faint)">
                  {label || p.date}
                </text>
              );
            })}
          </svg>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-[var(--muted)]">
            {SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function StatusDistributionChart({ distribution, loading, error, onRetry }) {
  const slices = [
    { key: 'read', label: 'Read', color: '#8b5cf6', value: Number(distribution?.read || 0) },
    { key: 'delivered_only', label: 'Delivered', color: '#25d366', value: Number(distribution?.delivered_only || 0) },
    { key: 'sent_only', label: 'Sent', color: '#3b82f6', value: Number(distribution?.sent_only || 0) },
    { key: 'failed', label: 'Failed', color: '#ef4444', value: Number(distribution?.failed || 0) },
    { key: 'pending', label: 'Pending', color: '#f59e0b', value: Number(distribution?.pending || 0) },
  ].filter((s) => s.value > 0);
  const total = Number(distribution?.total || 0);
  const cx = 90;
  const cy = 90;
  const r = 68;
  const ir = 44;
  let angle = -90;
  const arcs = slices.map((s) => {
    const sweep = total ? (s.value / total) * 360 : 0;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...s, d: donutPath(cx, cy, r, ir, start, end) };
  });
  const legend = [
    { label: 'Delivered', value: Number(distribution?.delivered || 0), color: '#25d366', rate: total ? (Number(distribution?.delivered || 0) / total) * 100 : 0 },
    { label: 'Read', value: Number(distribution?.read || 0), color: '#8b5cf6', rate: total ? (Number(distribution?.read || 0) / total) * 100 : 0 },
    { label: 'Failed', value: Number(distribution?.failed || 0), color: '#ef4444', rate: total ? (Number(distribution?.failed || 0) / total) * 100 : 0 },
    { label: 'Pending', value: Number(distribution?.pending || 0), color: '#f59e0b', rate: total ? (Number(distribution?.pending || 0) / total) * 100 : 0 },
  ];

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 font-extrabold text-[var(--ink)]">Status Distribution</div>
      {loading ? (
        <div className="h-56 animate-pulse rounded-xl bg-[var(--panel-2)]" />
      ) : error ? (
        <div className="grid h-56 place-items-center text-center text-sm text-[var(--muted)]">
          <div>
            Something went wrong while loading this report.
            <button type="button" className="btn btn-secondary mt-3 block mx-auto" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      ) : !total ? (
        <div className="grid h-56 place-items-center text-sm text-[var(--muted)]">No data found for the selected filters.</div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
            {arcs.map((s) => (
              <path key={s.key} d={s.d} fill={s.color} />
            ))}
            <text x="90" y="86" textAnchor="middle" fontSize="18" fontWeight="800" fill="currentColor">
              {formatCount(total)}
            </text>
            <text x="90" y="106" textAnchor="middle" fontSize="11" fill="var(--muted)">
              Total
            </text>
          </svg>
          <div className="w-full space-y-2 text-sm">
            {legend.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="font-bold text-[var(--muted)]">
                  {formatCount(row.value)} ({row.rate.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function polar(cx, cy, r, angle) {
  const rad = (angle * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function donutPath(cx, cy, r, ir, start, end) {
  const large = end - start > 180 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const [x3, y3] = polar(cx, cy, ir, end);
  const [x4, y4] = polar(cx, cy, ir, start);
  if (end - start >= 359.99) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
      `M ${cx} ${cy - ir}`,
      `A ${ir} ${ir} 0 1 0 ${cx} ${cy + ir}`,
      `A ${ir} ${ir} 0 1 0 ${cx} ${cy - ir}`,
    ].join(' ');
  }
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${ir} ${ir} 0 ${large} 0 ${x4} ${y4} Z`;
}
