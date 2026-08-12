import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Lock } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import AuthLayout from '../components/AuthLayout';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token') || '';

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/auth/reset-password', { token, password });
      setMessage(data.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout heading="Reset Password" subheading="Choose a new password for your account">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}{' '}
            <Link className="font-semibold underline" to="/login">
              Sign in
            </Link>
          </div>
        ) : null}
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary w-full py-3" disabled={loading || !token}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </AuthLayout>
  );
}
