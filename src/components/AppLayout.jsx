import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Wallet,
  BarChart3,
  Settings,
  Phone,
  Building2,
  LogOut,
  Menu,
  ChevronDown,
  FolderOpen,
  UserRound,
  Search,
  History,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { BrandLockup } from './Brand';
import UserAvatar from './UserAvatar';
import NotificationsBell from './NotificationsBell';

function roleLabel(role) {
  if (role === 'admin') return 'Super Admin';
  if (role === 'member') return 'Member';
  return role || '';
}

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/whatsapp', label: 'Numbers', icon: Phone },
  { to: '/profile', label: 'Profile', icon: Building2 },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/groups', label: 'Groups', icon: FolderOpen },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/admin/wallet/transactions', label: 'Transactions', icon: Receipt, adminOnly: true },
  { to: '/admin/wallet/recharges', label: 'Recharge History', icon: History, adminOnly: true },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/users', label: 'Users', icon: UserRound, adminOnly: true },
];

const titles = {
  '/': 'Dashboard',
  '/whatsapp': 'Connected Numbers',
  '/contacts': 'Contacts',
  '/groups': 'Contact Groups',
  '/templates': 'Templates',
  '/campaigns': 'Campaigns',
  '/campaigns/new': 'Create Campaign',
  '/campaigns/create': 'Create Campaign',
  '/wallet': 'Wallet',
  '/admin/wallet': 'Wallet',
  '/admin/wallet/transactions': 'Transactions',
  '/admin/wallet/recharges': 'Recharge History',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/profile': 'Business Profile',
  '/users': 'Users',
};

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const { refreshUnread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    refreshUnread();
  }, [location.pathname, refreshUnread]);

  const pageTitle = useMemo(() => {
    if (
      location.pathname.startsWith('/campaigns/') &&
      !['/campaigns/new', '/campaigns/create'].includes(location.pathname)
    ) {
      return 'Campaign Progress';
    }
    return titles[location.pathname] || 'Dashboard';
  }, [location.pathname]);

  const navLinks = links.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr] bg-[var(--surface)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[250px] bg-[var(--sidebar)] text-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-5 py-5 border-b border-white/5">
            <BrandLockup light compact />
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={`${to}-${label}`}
                to={to}
                end={to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/5 p-4">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <UserAvatar user={user} size={40} className="ring-2 ring-white/10" />
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-bold">{user?.name}</div>
                <div className="text-xs text-slate-400">{roleLabel(user?.role)}</div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            {menuOpen ? (
              <button
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <LogOut size={15} /> Logout
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {open ? <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-[var(--line)] bg-white px-4 py-3 md:px-6">
          <div className="flex shrink-0 items-center gap-3">
            <button className="btn btn-secondary !px-2.5" onClick={() => setOpen(true)}>
              <Menu size={18} />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{pageTitle}</h1>
          </div>

          <div className="mx-auto hidden min-w-0 max-w-xl flex-1 md:block">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-full rounded-full border border-[var(--line)] bg-[#f8fafc] pl-10 pr-14 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--wa)] focus:bg-white focus:ring-2 focus:ring-[var(--wa)]/15"
                placeholder="Search anything..."
                aria-label="Search"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[var(--line)] bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                ⌘ K
              </span>
            </label>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NotificationsBell />
            <Link to="/settings">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--line)] bg-white pl-1 pr-3 py-1">
                <UserAvatar user={user} size={32} />
                <div className="leading-tight">
                  <div className="text-sm font-bold text-slate-800">{user?.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400">{roleLabel(user?.role)}</div>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
