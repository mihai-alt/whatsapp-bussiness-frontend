export function WhatsAppMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M22.8 19.6c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.1 3.3 5.2 4.5 2.1.8 2.5.7 3 .6.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3-.1 0-.3-.1-.6-.3z"
      />
      <path
        fill="#fff"
        d="M16 6.5c-5.2 0-9.5 4.2-9.5 9.4 0 1.7.4 3.2 1.2 4.6L6.5 25l4.7-1.2c1.3.7 2.8 1.1 4.4 1.1 5.2 0 9.5-4.2 9.5-9.4S21.2 6.5 16 6.5zm0 17.2c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-2.8.7.7-2.7-.2-.3c-.8-1.2-1.2-2.6-1.2-4.1 0-4.3 3.5-7.8 7.9-7.8s7.9 3.5 7.9 7.8-3.5 7.8-7.9 7.8z"
      />
    </svg>
  );
}

export function BrandLockup({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <WhatsAppMark size={compact ? 28 : 34} />
      <div className="leading-tight">
        <div className={`font-extrabold ${light ? 'text-white' : 'text-slate-900'} ${compact ? 'text-sm' : 'text-base'}`}>
          WhatsApp Business
        </div>
        <div className={`font-semibold ${light ? 'text-slate-300' : 'text-slate-500'} ${compact ? 'text-xs' : 'text-sm'}`}>
          BSP Dashboard
        </div>
      </div>
    </div>
  );
}
