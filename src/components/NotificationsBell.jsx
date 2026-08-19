import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FolderPlus,
  Info,
  Phone,
  UserPlus,
  XCircle,
} from '../lib/lucideIcons';
import { useNotifications } from '../context/NotificationsContext';
import { PageLoader } from './ui';
import SafeIcon from './SafeIcon';

function iconFor(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('number_connected') || t.includes('number_reconnected')) {
    return { Icon: Phone, tone: 'bg-emerald-50 text-emerald-600' };
  }
  if (t.includes('number_disconnected')) {
    return { Icon: Phone, tone: 'bg-amber-50 text-amber-600' };
  }
  if (t.includes('group_access') || t.includes('contact_group')) {
    return { Icon: FolderPlus, tone: 'bg-sky-50 text-sky-600' };
  }
  if (t.includes('contact_')) {
    return { Icon: UserPlus, tone: 'bg-blue-50 text-blue-600' };
  }
  if (t.includes('fail') || t.includes('low_wallet') || t.includes('reject')) {
    return { Icon: t.includes('reject') ? XCircle : AlertTriangle, tone: 'bg-red-50 text-red-500' };
  }
  if (t.includes('approved') || t.includes('completed') || t.includes('success')) {
    return { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' };
  }
  return { Icon: Info, tone: 'bg-blue-50 text-blue-600' };
}

function timeAgo(value) {
  if (!value) return '';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export default function NotificationsBell() {
  const { unread, items, loading, refreshItems, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  async function showPanel() {
    clearCloseTimer();
    setOpen(true);
    await Promise.all([refreshItems(), markAllRead()]);
  }

  function scheduleHide() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || unread === 0) return;
    markAllRead();
  }, [open, unread, markAllRead]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={showPanel}
      onMouseLeave={scheduleHide}
    >
      <button
        type="button"
        className={`relative grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] transition hover:bg-[var(--panel-2)] ${
          open ? 'bg-[var(--panel-2)] ring-2 ring-[var(--wa)]/15' : ''
        }`}
        onClick={() => {
          if (open) setOpen(false);
          else showPanel();
        }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <SafeIcon icon={Bell} size={18} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-b-md border border-t-0 border-[var(--line)] bg-[var(--panel)] shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleHide}
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="text-[15px] font-bold text-[var(--ink)]">Notifications</div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading && !items.length ? (
              <PageLoader className="py-10" size="sm" />
            ) : !items.length ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#e8faf0]">
                  <SafeIcon icon={Bell} size={20} className="text-[var(--wa)]" />
                </div>
                <div className="text-sm font-bold text-[var(--ink)]">No notifications yet</div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  New alerts will appear here and stay in your history.
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const { Icon, tone } = iconFor(n.type);
                  return (
                    <li
                      key={n.id}
                      className="flex cursor-default gap-3 border-b border-[var(--line)] px-4 py-3 last:border-b-0 hover:bg-[var(--panel-2)]"
                    >
                      <div
                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md ${tone}`}
                      >
                        <SafeIcon icon={Icon} size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] leading-snug text-[var(--ink-soft)]">
                          <span className="font-semibold text-[var(--ink)]">{n.title}</span>
                          {n.body ? (
                            <>
                              {': '}
                              <span className="text-[var(--muted)]">{n.body}</span>
                            </>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--faint)]">{timeAgo(n.created_at)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
