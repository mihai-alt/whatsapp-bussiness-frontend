import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/api';
import AuthLayout from '../components/AuthLayout';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState((searchParams.get('email') || '').trim().toLowerCase());

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [autoResent, setAutoResent] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!email || autoResent || !searchParams.get('resend')) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await resendVerification(email);
        if (!cancelled) {
          setAutoResent(true);
          setCooldown(RESEND_SECONDS);
          setInfo(data.message || 'A new verification code was sent.');
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const code = useMemo(() => digits.join(''), [digits]);
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => `${a}${'•'.repeat(Math.min(b.length, 6))}${c}`)
    : '';

  async function onVerify(e) {
    e.preventDefault();
    if (!email) {
      setError('Missing email. Please register again.');
      return;
    }
    if (code.length !== CODE_LENGTH) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, code);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
      setDigits(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (!email || cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await resendVerification(email);
      setCooldown(RESEND_SECONDS);
      setInfo(data.message || 'A new verification code was sent.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function updateDigit(index, value) {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    const chars = cleaned.slice(0, CODE_LENGTH - index).split('');
    const next = [...digits];
    chars.forEach((ch, i) => {
      next[index + i] = ch;
    });
    setDigits(next);
    inputRefs.current[Math.min(index + chars.length, CODE_LENGTH - 1)]?.focus();
  }

  function onDigitKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  if (!email) {
    return (
      <AuthLayout heading="Verify your email" subheading="We need your signup email to continue">
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No email was provided. Please register again or open the link from login.
          </div>
          <Link to="/register" className="btn btn-primary w-full py-3">
            Go to Register
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Verify your email"
      subheading={`Enter the 6-digit code we sent to ${maskedEmail}`}
    >
      <form onSubmit={onVerify} className="space-y-5">
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {info ? <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{info}</div> : null}

        <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          <Mail size={16} className="text-[var(--wa)]" />
          <span className="font-semibold text-slate-800">{email}</span>
        </div>

        <div className="flex justify-between gap-2 sm:gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              className="h-12 w-10 rounded-xl border border-[var(--line)] text-center text-lg font-extrabold text-slate-900 outline-none transition focus:border-[var(--wa)] focus:ring-2 focus:ring-[var(--wa)]/20 sm:h-14 sm:w-12"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={d}
              onChange={(e) => updateDigit(i, e.target.value)}
              onKeyDown={(e) => onDigitKeyDown(i, e)}
              onPaste={(e) => {
                e.preventDefault();
                updateDigit(0, e.clipboardData.getData('text'));
              }}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        <button className="btn btn-primary w-full py-3" disabled={loading || code.length !== CODE_LENGTH}>
          <ShieldCheck size={16} />
          {loading ? 'Verifying…' : 'Verify Email'}
        </button>

        <div className="text-center text-sm text-slate-500">
          Didn’t get the code?{' '}
          <button
            type="button"
            className="font-semibold text-[var(--wa-deep)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onResend}
            disabled={loading || cooldown > 0}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>

        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Back to registration
        </Link>
      </form>
    </AuthLayout>
  );
}
