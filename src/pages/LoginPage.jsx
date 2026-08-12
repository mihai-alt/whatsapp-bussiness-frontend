import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getErrorCode } from '../lib/api';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (getErrorCode(err) === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(email)}&resend=1`);
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout heading="Welcome Back!" subheading="Login to your account to continue">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input input-with-icon pr-11"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-semibold text-[var(--wa-deep)] hover:underline">
            Forgot Password?
          </Link>
          <div className="text-slate-500">
            New here?{' '}
            <Link to="/register" className="font-semibold text-[var(--wa-deep)] hover:underline">
              Register here
            </Link>
          </div>
        </div>

        <button className="btn btn-primary w-full py-3 text-base" disabled={loading}>
          <Lock size={16} />
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="relative py-2">
          <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
          <div className="relative mx-auto grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-slate-400 border border-slate-200">
            OR
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-[var(--wa)]" />
          Secure login with JWT authentication
        </div>
      </form>
    </AuthLayout>
  );
}
