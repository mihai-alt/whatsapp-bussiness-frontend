import { Link } from 'react-router';
import {
  LayoutDashboard,
  Phone,
  Users,
  FileText,
  Megaphone,
  BarChart3,
  Wallet,
  Settings,
  MessageCircle,
} from 'lucide-react';
import { BrandLockup, WhatsAppMark } from './Brand';

const previewNav = [
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  BarChart3,
  Wallet,
  Settings,
];

export default function AuthLayout({ children, heading, subheading }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
        <div className="mb-8">
          <BrandLockup />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{heading}</h1>
        <p className="mt-2 text-slate-500">{subheading}</p>
        <div className="mt-8 max-w-md">{children}</div>
      </div>

      <div className="relative hidden lg:block auth-preview-grid overflow-hidden border-l border-[var(--line)]">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-10 top-16 h-40 w-40 rounded-full border border-dashed border-[var(--wa)]" />
          <div className="absolute right-16 bottom-24 h-28 w-28 rounded-full border border-dashed border-[var(--wa-deep)]" />
        </div>

        <div className="relative z-10 flex h-full items-center justify-center p-10">
          <div className="w-full max-w-xl rounded-2xl border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/80 backdrop-blur overflow-hidden">
            <div className="grid grid-cols-[64px_1fr]">
              <div className="bg-[var(--sidebar)] py-4 px-2 space-y-2">
                <div className="mb-3 grid place-items-center">
                  <WhatsAppMark size={26} />
                </div>
                {previewNav.map((Icon, idx) => (
                  <div
                    key={idx}
                    className={`mx-auto grid h-9 w-9 place-items-center rounded-lg ${
                      idx === 0 ? 'bg-[var(--wa)] text-white' : 'text-slate-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#f7faf8]">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Connected Number', '+91 98765 43210'],
                    ['Quality Rating', 'Green'],
                    ['Messages Sent Today', '1,248'],
                    ['Delivered', '1,190'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-white border border-[var(--line)] p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                      <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
                      <div className="mt-2 h-6 rounded bg-gradient-to-r from-emerald-100 to-transparent" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-white border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">Recent Campaigns</div>
                    <Link to="/login" className="text-xs font-semibold text-[var(--wa-deep)] pointer-events-none">
                      View All Campaigns
                    </Link>
                  </div>
                  <div className="mt-3 space-y-2">
                    {['Summer Sale Blast', 'Order Updates', 'Welcome Series'].map((name) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{name}</span>
                        <span className="badge badge-ok">Completed</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-sm border border-[var(--line)]">
          <MessageCircle size={16} className="text-[var(--wa)]" />
          <span className="text-xs font-semibold text-slate-600">Official Meta Cloud API ready</span>
        </div>
        <div className="absolute right-12 top-16 grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-md border border-[var(--line)]">
          <Phone className="text-[var(--wa)]" size={20} />
        </div>
        <div className="absolute right-24 bottom-28 grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-md border border-[var(--line)]">
          <BarChart3 className="text-[var(--wa-deep)]" size={20} />
        </div>
      </div>
    </div>
  );
}
