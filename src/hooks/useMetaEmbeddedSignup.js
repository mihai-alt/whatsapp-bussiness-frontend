import { useCallback, useRef, useState } from 'react';
import { api, getErrorMessage } from '../lib/api';
import { launchMetaEmbeddedSignup } from '../services/metaEmbeddedSignup';

export function useMetaEmbeddedSignup() {
  const [phase, setPhase] = useState('idle'); // idle | intro | redirecting | completing | success | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [progressStep, setProgressStep] = useState(0);
  const busyRef = useRef(false);

  const reset = useCallback(() => {
    busyRef.current = false;
    setPhase('idle');
    setError('');
    setResult(null);
    setProgressStep(0);
  }, []);

  const connect = useCallback(async (metaConfig) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setError('');
    setResult(null);
    setProgressStep(0);

    let config = metaConfig;
    try {
      const { data: res } = await api.get('/api/meta/embedded-signup');
      config = res.data;
    } catch {
      /* use provided */
    }

    const appId = String(config?.appId || import.meta.env.VITE_META_APP_ID || '').trim();
    const configId = String(config?.configId || import.meta.env.VITE_META_CONFIG_ID || '').trim();
    const graphVersion = String(
      config?.graphVersion || import.meta.env.VITE_META_GRAPH_VERSION || 'v21.0'
    ).trim();

    if (!appId || !configId) {
      const missing = config?.missing?.length
        ? config.missing.join(', ')
        : 'META_APP_ID, META_APP_SECRET, META_CONFIG_ID';
      setError(
        `Meta Embedded Signup is not configured (${missing}). Add them to backend/.env, restart the API, then retry.`
      );
      setPhase('error');
      busyRef.current = false;
      return null;
    }

    try {
      setPhase('redirecting');
      const session = await launchMetaEmbeddedSignup({ appId, configId, graphVersion });

      setPhase('completing');
      setProgressStep(1);
      const tick = setInterval(() => {
        setProgressStep((s) => Math.min(s + 1, 3));
      }, 700);

      const { data: res } = await api.post('/api/numbers/meta/connect', {
        code: session.code,
        authorizationCode: session.code,
        phoneNumberId: session.phoneNumberId || undefined,
        wabaId: session.wabaId || undefined,
        businessId: session.businessId || undefined,
        sessionInfo: session.sessionInfo || undefined,
        event: session.event || undefined,
      });

      clearInterval(tick);
      setProgressStep(4);
      const number = res.number || res.data;
      setResult(number);
      setPhase('success');
      busyRef.current = false;
      return number;
    } catch (err) {
      const msg =
        err?.code === 'USER_CANCELLED'
          ? err.message
          : getErrorMessage(err) || err?.message || 'Unable to connect the WhatsApp Business number.';
      setError(msg);
      setPhase('error');
      busyRef.current = false;
      return null;
    }
  }, []);

  return {
    phase,
    error,
    result,
    progressStep,
    busy: phase === 'redirecting' || phase === 'completing',
    setPhase,
    connect,
    reset,
  };
}
