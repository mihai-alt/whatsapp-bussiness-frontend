const API_URL = import.meta.env.VITE_API_URL || '';

/** Resolve stored avatar path (/uploads/...) or absolute URL for <img src>. */
export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${API_URL}${path}`;
  return `${API_URL}/${path}`;
}

export function userInitials(name = 'U') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
