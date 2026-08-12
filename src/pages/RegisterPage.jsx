import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getErrorCode } from '../lib/api';
import AuthLayout from '../components/AuthLayout';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'EMAIL_EXISTS') {
        setError('This email is already registered. Please log in.');
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout heading="Create Account" subheading="Create your account to get started">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}{' '}
            {error.includes('already registered') ? (
              <Link to="/login" className="font-semibold text-[var(--wa-deep)] underline">
                Login
              </Link>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="label">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon"
              placeholder="Enter your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </div>
        </div>
        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon"
              type="password"
              minLength={8}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
        </div>

        <button className="btn btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
        <div className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[var(--wa-deep)]">
            Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
