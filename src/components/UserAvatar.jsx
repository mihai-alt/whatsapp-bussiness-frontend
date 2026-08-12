import { mediaUrl, userInitials } from '../lib/media';

export default function UserAvatar({ user, size = 40, className = '' }) {
  const src = mediaUrl(user?.avatar_url);
  const initials = userInitials(user?.name || user?.email || 'U');
  const style = { width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.34)) };

  if (src) {
    return (
      <img
        src={src}
        alt={user?.name || 'Avatar'}
        className={`rounded-full object-cover bg-slate-100 ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`grid place-items-center rounded-full bg-[#e8faf0] font-extrabold text-[var(--wa-deep)] ${className}`}
      style={style}
    >
      {initials}
    </div>
  );
}
