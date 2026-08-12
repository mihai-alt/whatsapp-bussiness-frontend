import { Link } from 'react-router';

export function Breadcrumb({ items = [] }) {
  return (
    <div className="text-xs font-semibold text-slate-400 mb-1">
      {items.map((item, idx) => (
        <span key={`${item.label}-${idx}`}>
          {idx > 0 ? <span className="mx-1.5">›</span> : null}
          {item.to ? (
            <Link to={item.to} className="hover:text-[var(--wa-deep)]">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-600">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function PageShell({ title, breadcrumb, actions, children }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
          {title ? <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function FilterTabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              active
                ? 'bg-[var(--wa)] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-[var(--line)] hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function DataTable({ columns, rows, empty = 'No records found.', rowClassName }) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f8fafc] text-left text-slate-400">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-bold whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const extra = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
            return (
              <tr
                key={row.id ?? JSON.stringify(row)}
                className={`border-t border-[var(--line)] hover:bg-slate-50/70 ${extra || ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 align-middle">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function IconAction({ children, onClick, title, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'border-red-100 text-red-500 hover:bg-red-50'
          : 'border-[var(--line)] text-slate-500 hover:bg-slate-50 hover:text-[var(--wa-deep)]'
      }`}
    >
      {children}
    </button>
  );
}
