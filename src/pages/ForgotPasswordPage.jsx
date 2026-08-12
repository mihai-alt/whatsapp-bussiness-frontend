import { useState } from 'react';
import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { api, getErrorMessage } from '../lib/api';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout heading="Forgot Password" subheading="We'll email a reset link if the account exists">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}
        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <div className="text-center text-sm">
          <Link to="/login" className="font-semibold text-[var(--wa-deep)]">
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
