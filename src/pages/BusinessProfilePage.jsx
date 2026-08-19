import { useEffect, useState } from 'react';
import { Building2, Link2 } from 'lucide-react';
import { Link } from 'react-router';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/PageShell';
import { PageLoader } from '../components/ui';

export default function BusinessProfilePage() {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [profile, setProfile] = useState(null);
  const [about, setAbout] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    setLoadingAccounts(true);
    api
      .get('/api/whatsapp')
      .then((res) => {
        const connected = (res.data.data || []).filter((a) => a.status === 'connected');
        setAccounts(connected);
        if (connected[0]) setAccountId(String(connected[0].id));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoadingAccounts(false));
  }, []);

  useEffect(() => {
    if (!accountId) return;
    api
      .get(`/api/profile/business/${accountId}`)
      .then((res) => {
        setProfile(res.data.data);
        setAbout(res.data.data.local?.about_text || res.data.data.remote?.about || '');
        setEmail(res.data.data.remote?.email || '');
        setWebsite(res.data.data.remote?.websites?.[0] || '');
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [accountId]);

  async function saveAbout() {
    setMessage('');
    setError('');
    try {
      await api.patch(`/api/profile/business/${accountId}`, { about });
      setMessage('About updated');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function saveDetails() {
    setMessage('');
    setError('');
    try {
      const payload = {};
      if (email) payload.email = email;
      if (website) payload.websites = [website];
      await api.patch(`/api/profile/business/${accountId}`, payload);
      setMessage('Business details updated');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function uploadPicture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/api/profile/business/${accountId}/picture`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Profile picture update submitted to Meta');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loadingAccounts) {
    return (
      <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Business Profile' }]}>
        <div className="card min-h-[calc(100vh-11.5rem)]">
          <PageLoader className="min-h-[calc(100vh-11.5rem)]" size="lg" />
        </div>
      </PageShell>
    );
  }

  if (!accounts.length) {
    return (
      <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Business Profile' }]}>
        <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden">
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8faf0]">
              <Building2 size={26} className="text-[var(--wa)]" strokeWidth={2.25} />
            </div>
            <div className="text-base font-extrabold text-slate-900">Connect WhatsApp first</div>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              A connected number is required to manage the business profile.
            </p>
            <Link to="/whatsapp" className="btn btn-primary mt-5 inline-flex">
              <Link2 size={16} /> Connect Number
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const local = profile?.local || {};
  const remote = profile?.remote || {};
  const picture = local.profile_picture_url || remote.profile_picture_url;
  const initials = (local.business_name || 'B').slice(0, 2).toUpperCase();

  return (
    <PageShell breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Business Profile' }]}>
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
      ) : null}

      <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col overflow-hidden p-5 sm:p-6">
        <div className="my-auto w-full space-y-5">
          <div className="max-w-sm">
            <label className="label">WhatsApp Account</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.business_name || a.phone_number} ({a.phone_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-5 rounded-xl border border-[var(--line)] bg-slate-50/40 p-5">
              <div className="font-extrabold text-slate-900">Business Profile</div>
              <div className="flex items-center gap-4">
                {picture ? (
                  <img
                    src={picture}
                    alt=""
                    className="h-20 w-20 rounded-full border border-[var(--line)] object-cover"
                  />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-[#e8faf0] text-xl font-extrabold text-[var(--wa-deep)]">
                    {initials}
                  </div>
                )}
                {isAdmin ? (
                  <label className="btn btn-secondary cursor-pointer">
                    Change
                    <input type="file" accept="image/*" className="hidden" onChange={uploadPicture} />
                  </label>
                ) : null}
              </div>

              <div>
                <label className="label">Display Name</label>
                <div className="flex gap-2">
                  <input className="input" value={local.business_name || ''} disabled />
                  <button
                    type="button"
                    className="btn btn-secondary whitespace-nowrap"
                    disabled
                    title="Managed by Meta"
                  >
                    Update
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Display name is controlled in Meta Business Manager where supported.
                </p>
              </div>

              <div>
                <label className="label">About</label>
                <div className="flex gap-2">
                  <textarea
                    className="input min-h-24"
                    maxLength={139}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    disabled={!isAdmin}
                  />
                  {isAdmin ? (
                    <button
                      type="button"
                      className="btn btn-primary self-start whitespace-nowrap"
                      onClick={saveAbout}
                    >
                      Update
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-[var(--line)] bg-slate-50/40 p-5">
              <div className="font-extrabold text-slate-900">Business Details</div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" value={local.phone_number || ''} disabled />
              </div>
              <div>
                <label className="label">Business Verification</label>
                <div className="flex items-center gap-2">
                  <span className="badge badge-ok">Verified</span>
                  <span className="text-xs text-slate-400">Quality: {local.quality_rating || '—'}</span>
                </div>
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  className="input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin ? (
                <button type="button" className="btn btn-primary" onClick={saveDetails}>
                  Update Details
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
