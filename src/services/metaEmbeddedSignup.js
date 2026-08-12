/**
 * Official Meta WhatsApp Embedded Signup (Facebook JS SDK).
 * App ID / Config ID come from backend (never App Secret).
 */

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

function isFacebookOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'facebook.com' || hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

function parseSessionPayload(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeFinishEvent(payload) {
  const event = String(payload?.event || '').toUpperCase();
  const data = payload?.data || {};
  return {
    event,
    phoneNumberId: data.phone_number_id ? String(data.phone_number_id) : null,
    wabaId: data.waba_id
      ? String(data.waba_id)
      : data.waba_ids?.[0]
        ? String(data.waba_ids[0])
        : null,
    businessId: data.business_id ? String(data.business_id) : null,
    currentStep: data.current_step || null,
    errorMessage: data.error_message || null,
    raw: payload,
  };
}

let sdkLoadPromise = null;

function loadFacebookSdk(appId, graphVersion) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Facebook SDK can only load in the browser'));
  }
  if (window.FB && window.__waFbInitializedFor === appId) {
    return Promise.resolve(window.FB);
  }
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const version = String(graphVersion || 'v21.0').startsWith('v')
      ? String(graphVersion || 'v21.0')
      : `v${graphVersion}`;

    const prev = window.fbAsyncInit;
    window.fbAsyncInit = function fbAsyncInit() {
      try {
        if (typeof prev === 'function') prev();
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version,
        });
        window.__waFbInitializedFor = appId;
        resolve(window.FB);
      } catch (err) {
        sdkLoadPromise = null;
        reject(err);
      }
    };

    if (document.getElementById('facebook-jssdk')) {
      if (window.FB) window.fbAsyncInit();
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = SDK_SRC;
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error('Failed to load the Meta JavaScript SDK'));
    };
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

export function launchMetaEmbeddedSignup({ appId, configId, graphVersion }) {
  const resolvedAppId = String(appId || import.meta.env.VITE_META_APP_ID || '').trim();
  const resolvedConfigId = String(configId || import.meta.env.VITE_META_CONFIG_ID || '').trim();
  const resolvedVersion = String(
    graphVersion || import.meta.env.VITE_META_GRAPH_VERSION || 'v21.0'
  ).trim();

  if (!resolvedAppId) {
    return Promise.reject(
      Object.assign(
        new Error('Meta App ID is missing. Set META_APP_ID in backend/.env and restart the API.'),
        { code: 'MISSING_APP_ID' }
      )
    );
  }
  if (!resolvedConfigId) {
    return Promise.reject(
      Object.assign(
        new Error('Meta Config ID is missing. Set META_CONFIG_ID in backend/.env and restart the API.'),
        { code: 'MISSING_CONFIG_ID' }
      )
    );
  }

  return loadFacebookSdk(resolvedAppId, resolvedVersion).then(
    (FB) =>
      new Promise((resolve, reject) => {
        let settled = false;
        let code = null;
        let session = null;
        let waitTimer = null;

        const cleanup = () => {
          window.removeEventListener('message', onMessage);
          if (waitTimer) clearTimeout(waitTimer);
        };

        const fail = (error, errorCode) => {
          if (settled) return;
          settled = true;
          cleanup();
          const err = error instanceof Error ? error : new Error(String(error));
          if (errorCode) err.code = errorCode;
          reject(err);
        };

        const succeed = (payload) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(payload);
        };

        const tryComplete = () => {
          if (settled || !code) return;
          if (session?.event?.startsWith('FINISH') || session?.wabaId || session?.phoneNumberId) {
            succeed({
              code,
              phoneNumberId: session?.phoneNumberId || null,
              wabaId: session?.wabaId || null,
              businessId: session?.businessId || null,
              event: session?.event || 'FINISH',
              sessionInfo: session?.raw || null,
            });
            return;
          }
          if (!session) {
            if (waitTimer) clearTimeout(waitTimer);
            waitTimer = setTimeout(() => {
              if (settled || !code) return;
              succeed({
                code,
                phoneNumberId: session?.phoneNumberId || null,
                wabaId: session?.wabaId || null,
                businessId: session?.businessId || null,
                event: session?.event || 'FINISH',
                sessionInfo: session?.raw || null,
              });
            }, 2500);
          }
        };

        const onMessage = (event) => {
          if (!isFacebookOrigin(event.origin)) return;
          const payload = parseSessionPayload(event.data);
          if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return;

          const normalized = normalizeFinishEvent(payload);
          const ev = normalized.event;

          if (ev === 'CANCEL') {
            fail(
              new Error(
                normalized.errorMessage ||
                  (normalized.currentStep
                    ? `Meta onboarding was cancelled at step: ${normalized.currentStep}`
                    : 'Meta onboarding was cancelled.')
              ),
              'USER_CANCELLED'
            );
            return;
          }
          if (ev === 'ERROR') {
            fail(
              new Error(normalized.errorMessage || 'Meta Embedded Signup reported an error.'),
              'META_FLOW_ERROR'
            );
            return;
          }
          if (ev.startsWith('FINISH') || ev === '') {
            session = normalized;
            tryComplete();
          }
        };

        window.addEventListener('message', onMessage);

        try {
          FB.login(
            (response) => {
              if (response?.authResponse?.code) {
                code = response.authResponse.code;
                tryComplete();
                return;
              }
              if (!settled) {
                fail(new Error('Meta onboarding was cancelled or did not complete.'), 'USER_CANCELLED');
              }
            },
            {
              config_id: resolvedConfigId,
              response_type: 'code',
              override_default_response_type: true,
              extras: {
                setup: {},
                featureType: '',
                sessionInfoVersion: '3',
              },
            }
          );
        } catch (err) {
          fail(err, 'SDK_LAUNCH_FAILED');
        }
      })
  );
}
