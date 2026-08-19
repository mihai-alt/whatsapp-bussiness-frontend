export function isIcon(x) {
  return typeof x === 'function' || (Boolean(x) && typeof x === 'object' && Boolean(x.$$typeof));
}
