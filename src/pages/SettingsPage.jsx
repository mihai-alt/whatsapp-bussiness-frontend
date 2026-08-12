import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BellRing,
  Calendar,
  Camera,
  CircleHelp,
  CreditCard,
  Globe2,
  Link2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plug,
  RefreshCw,
  Settings2,
  Shield,
  UserRound,
  Webhook,
} from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { Breadcrumb } from '../components/PageShell';
import { mediaUrl } from '../lib/media';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: '(GMT+05:30) Asia/Kolkata' },
  { value: 'UTC', label: '(GMT+00:00) UTC' },
  { value: 'America/New_York', label: '(GMT-05:00) America/New_York' },
  { value: 'Europe/London', label: '(GMT+00:00) Europe/London' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Asia/Dubai' },
  { value: 'Asia/Singapore', label: '(GMT+08:00) Asia/Singapore' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'password', label: 'Change Password', icon: Lock },
  // { id: 'api', label: 'API Settings', icon: Shield },
  // { id: 'webhook', label: 'Webhook', icon: Webhook },
  // { id: 'pricing', label: 'General Settings', icon: Settings2, adminOnly: true },
  // { id: 'notifications', label: 'Notification Settings', icon: BellRing },
  // { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  // { id: 'integrations', label: 'Integrations', icon: Plug },
  // { id: 'activity', label: 'Activity Logs', icon: Activity },
];

function FieldLabel({ children }) {
  return <label className="mb-1.5 block text-sm font-bold text-slate-900">{children}</label>;
}

function IconField({ icon: Icon, children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      {children}
    </div>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--wa)] focus:ring-2 focus:ring-[var(--wa)]/15';
const selectClass = `${inputClass} appearance-none pr-9`;
const textareaClass =
  'min-h-[110px] w-full resize-y rounded-xl border border-[var(--line)] bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--wa)] focus:ring-2 focus:ring-[var(--wa)]/15';

function emptyForm(user) {
  return {
    name: user?.name || '',
    phone: user?.phone || '',
    language: user?.language || 'en',
    timezone: user?.timezone || 'Asia/Kolkata',
    date_format: user?.date_format || 'DD/MM/YYYY',
    bio: user?.bio || '',
  };
}

export default function SettingsPage() {
  const { user, setUser, isAdmin } = useAuth();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState(() => emptyForm(user));
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pricing, setPricing] = useState([]);
  const [waConfig, setWaConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setForm(emptyForm(user));
  }, [user]);

  useEffect(() => {
    api.get('/api/wallet/pricing').then((res) => setPricing(res.data.data)).catch(() => {});
    api.get('/api/whatsapp/config').then((res) => setWaConfig(res.data.data)).catch(() => {});
  }, []);

  const nav = useMemo(() => NAV_ITEMS.filter((t) => !t.adminOnly || isAdmin), [isAdmin]);
  const activeLabel = nav.find((n) => n.id === tab)?.label || 'Profile';
  const displaySrc = preview || mediaUrl(user?.avatar_url);

  function flash(ok, text) {
    setError(ok ? '' : text);
    setMessage(ok ? text : '');
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetProfile() {
    setForm(emptyForm(user));
    setPreview(null);
    setMessage('');
    setError('');
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/api/auth/me', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        language: form.language,
        timezone: form.timezone,
        date_format: form.date_format,
        bio: form.bio.trim() || null,
      });
      setUser(data.data.user);
      flash(true, 'Profile updated successfully');
    } catch (err) {
      flash(false, getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return flash(false, 'New passwords do not match');
    }
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      flash(true, 'Password changed successfully');
    } catch (err) {
      flash(false, getErrorMessage(err));
    }
  }

  async function savePricing(e) {
    e.preventDefault();
    try {
      const { data } = await api.put('/api/wallet/pricing', {
        items: pricing.map((p) => ({
          category: p.category,
          cost: Number(p.cost),
          provider_cost: Number(p.provider_cost || 0),
        })),
      });
      setPricing(data.data);
      flash(true, 'Pricing updated');
    } catch (err) {
      flash(false, getErrorMessage(err));
    }
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return flash(false, 'Please choose an image file');
    if (file.size > 2 * 1024 * 1024) return flash(false, 'Avatar must be 2MB or smaller');
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/api/auth/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data.data.user);
      setPreview(null);
      flash(true, 'Profile photo updated');
    } catch (err) {
      setPreview(null);
      flash(false, getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Settings', to: '/settings' },
          { label: activeLabel },
        ]}
      />

      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[var(--line)] bg-white p-2.5 shadow-sm">
          <nav className="space-y-0.5">
            {nav.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setMessage('');
                    setError('');
                  }}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? 'bg-[#ecfdf5] text-[var(--wa-deep)]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {active ? (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[var(--wa)]" />
                  ) : null}
                  <Icon size={17} className={active ? 'text-[var(--wa)]' : 'text-slate-400'} />
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          {tab === 'profile' ? (
            <form onSubmit={saveProfile} className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Profile Information</h2>
                  <p className="mt-1 text-sm text-slate-500">Update your profile information and account details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('activity')}
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--wa)]/40 bg-white px-3.5 py-2 text-sm font-bold text-[var(--wa-deep)] transition hover:bg-[#ecfdf5]"
                >
                  <RefreshCw size={15} className="text-[var(--wa)]" />
                  View Activity Logs
                </button>
              </div>

              <div className="flex flex-col gap-4 border-b border-[var(--line)] py-6 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="relative h-[88px] w-[88px] shrink-0"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile photo"
                >
                  {displaySrc ? (
                    <img
                      src={displaySrc}
                      alt=""
                      className="h-full w-full rounded-full object-cover ring-4 ring-slate-100"
                    />
                  ) : (
                    <UserAvatar user={user} size={88} className="ring-4 ring-slate-100" />
                  )}
                  <span className="absolute bottom-0.5 right-0.5 grid h-8 w-8 place-items-center rounded-full bg-[var(--wa)] text-white shadow-md ring-2 ring-white">
                    <Camera size={14} />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">Profile Photo</div>
                  <p className="mt-0.5 text-sm text-slate-500">JPG, GIF or PNG. Max size of 2MB</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload New Photo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onPickFile} />
                </div>
              </div>

              <div className="grid gap-5 py-6 md:grid-cols-2">
                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  <IconField icon={Mail}>
                    <input className={`${inputClass} bg-slate-50 text-slate-500`} value={user?.email || ''} disabled />
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Display Name</FieldLabel>
                  <IconField icon={UserRound}>
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      required
                      minLength={2}
                    />
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  <IconField icon={Phone}>
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Timezone</FieldLabel>
                  <IconField icon={Globe2}>
                    <select
                      className={selectClass}
                      value={form.timezone}
                      onChange={(e) => setField('timezone', e.target.value)}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Language</FieldLabel>
                  <IconField icon={Globe2}>
                    <select
                      className={selectClass}
                      value={form.language}
                      onChange={(e) => setField('language', e.target.value)}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Date Format</FieldLabel>
                  <IconField icon={Calendar}>
                    <select
                      className={selectClass}
                      value={form.date_format}
                      onChange={(e) => setField('date_format', e.target.value)}
                    >
                      {DATE_FORMATS.map((fmt) => (
                        <option key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                  </IconField>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Bio (Optional)</FieldLabel>
                  <div className="relative">
                    <Pencil size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                    <textarea
                      className={textareaClass}
                      value={form.bio}
                      onChange={(e) => setField('bio', e.target.value)}
                      placeholder="Write a short bio about yourself..."
                      maxLength={2000}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] pt-6">
                <button type="button" onClick={resetProfile} className="btn btn-secondary !px-5">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary !px-5" disabled={saving}>
                  {saving ? 'Saving…' : 'Update Profile'}
                </button>
              </div>
            </form>
          ) : null}

          {tab === 'password' ? (
            <form
              onSubmit={changePassword}
              className="flex min-h-[calc(100vh-11.5rem)] flex-col rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8"
            >
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Change Password</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Keep your account secure with a strong password.
                </p>
              </div>

              <div className="mt-8 grid max-w-3xl gap-6">
                <div>
                  <FieldLabel>Current Password</FieldLabel>
                  <IconField icon={Lock}>
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter current password"
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, currentPassword: e.target.value })
                      }
                      required
                    />
                  </IconField>
                </div>
                <div>
                  <FieldLabel>New Password</FieldLabel>
                  <IconField icon={Lock}>
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      minLength={8}
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      required
                    />
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Confirm New Password</FieldLabel>
                  <IconField icon={Lock}>
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      minLength={8}
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </IconField>
                </div>
              </div>

              <div className="mt-auto flex justify-end pt-10">
                <button type="submit" className="btn btn-primary !px-6 !py-2.5">
                  Update Password
                </button>
              </div>
            </form>
          ) : null}

          {tab === 'api' ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
              <div className="border-b border-[var(--line)] pb-6">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">API Settings</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configured via server environment variables. Values shown are non-secret metadata.
                </p>
              </div>
              <div className="grid max-w-2xl gap-5 py-6">
                {[
                  ['Graph Version', waConfig?.graphVersion || '—'],
                  ['Meta App ID', waConfig?.appId || 'Not set'],
                  ['Embedded Config ID', waConfig?.configId || 'Not set'],
                  ['Embedded Signup', waConfig?.embeddedSignupEnabled ? 'Enabled' : 'Disabled'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <FieldLabel>{label}</FieldLabel>
                    <IconField icon={Link2}>
                      <input className={`${inputClass} bg-slate-50`} value={value} disabled />
                    </IconField>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'webhook' ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
              <div className="border-b border-[var(--line)] pb-6">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Webhook</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use this callback URL in Meta Developer Console for message events.
                </p>
              </div>
              <div className="grid max-w-2xl gap-5 py-6">
                <div>
                  <FieldLabel>Callback URL</FieldLabel>
                  <IconField icon={Webhook}>
                    <input
                      className={`${inputClass} bg-slate-50`}
                      value={`${window.location.origin.replace('5173', '4000')}/webhooks/whatsapp`}
                      disabled
                    />
                  </IconField>
                </div>
                <div>
                  <FieldLabel>Verify Token</FieldLabel>
                  <IconField icon={Shield}>
                    <input className={`${inputClass} bg-slate-50`} value="Set in META_WEBHOOK_VERIFY_TOKEN" disabled />
                  </IconField>
                </div>
                <p className="text-sm text-slate-500">
                  Subscribe to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">messages</code> and{' '}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">message_template_status_update</code>.
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'pricing' && isAdmin ? (
            <form onSubmit={savePricing} className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
              <div className="border-b border-[var(--line)] pb-6">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">General Settings</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Customer charge is deducted from wallets. Provider cost is the underlying Meta/WhatsApp cost used for platform revenue
                  (revenue = charge − provider cost).
                </p>
              </div>
              <div className="grid max-w-2xl gap-4 py-6">
                <div className="grid grid-cols-[8rem_1fr_1fr] gap-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <div>Category</div>
                  <div>Customer charge (₹)</div>
                  <div>Provider cost (₹)</div>
                </div>
                {pricing.map((p, idx) => (
                  <div key={p.category} className="grid grid-cols-[8rem_1fr_1fr] items-center gap-3">
                    <div className="text-sm font-bold capitalize text-slate-600">{p.category}</div>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.cost}
                      onChange={(e) => {
                        const next = [...pricing];
                        next[idx] = { ...p, cost: e.target.value };
                        setPricing(next);
                      }}
                    />
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.provider_cost ?? 0}
                      onChange={(e) => {
                        const next = [...pricing];
                        next[idx] = { ...p, provider_cost: e.target.value };
                        setPricing(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-[var(--line)] pt-6">
                <button className="btn btn-primary !px-5">Save Settings</button>
              </div>
            </form>
          ) : null}

          {['notifications', 'billing', 'integrations', 'activity'].includes(tab) ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm md:p-8">
              <div className="border-b border-[var(--line)] pb-6">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  {NAV_ITEMS.find((n) => n.id === tab)?.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {tab === 'notifications' && 'Choose how and when you receive product alerts.'}
                  {tab === 'billing' && 'Review your plan and billing preferences.'}
                  {tab === 'integrations' && 'Connect third-party tools to your workspace.'}
                  {tab === 'activity' && 'Recent account activity will appear here.'}
                </p>
              </div>
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#ecfdf5] text-[var(--wa)]">
                  <CircleHelp size={22} />
                </div>
                <p className="text-sm font-semibold text-slate-700">Coming soon</p>
                <p className="mt-1 text-sm text-slate-500">This section is reserved for future settings.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
