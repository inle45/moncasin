export function SlotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" />
      <path d="M7 4V2M12 4V2M17 4V2" strokeLinecap="round" />
    </svg>
  );
}

export function LeaderboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M4 20h16M6 20V10l3-2 3 4 3-6 3 4v10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6h2v4H8zM14 4h2v6h-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function VipShopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.4 5.7 21l2.3-7.2-6-4.6h7.6L12 2z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" strokeDasharray="2 3" opacity="0.4" />
    </svg>
  );
}

export function CrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        d="M4 18c4-8 8-12 12-14 4 2 4 6 4 14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 4l4 2-2 4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function JackpotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 7v5l3 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12h8M12 8v8"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function WheelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l6.5 3.75M12 12L5.5 8.75" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
