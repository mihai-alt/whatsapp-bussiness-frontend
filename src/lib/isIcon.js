export function isIcon(x) {
  if (typeof x === 'function') return true;
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const t = x.$$typeof;
  return (
    t === Symbol.for('react.forward_ref') ||
    t === Symbol.for('react.memo') ||
    t === Symbol.for('react.lazy')
  );
}

export function toIcon(mod) {
  const candidates = [mod, mod?.default];
  if (mod && typeof mod === 'object' && !Array.isArray(mod)) {
    for (const value of Object.values(mod)) {
      if (!Array.isArray(value)) candidates.push(value);
    }
  }
  for (const candidate of candidates) {
    if (isIcon(candidate)) return candidate;
  }
  return function IconFallback() {
    return null;
  };
}
