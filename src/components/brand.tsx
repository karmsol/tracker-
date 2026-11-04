export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#10101f" />
      <path
        d="M8 22.5c6.2-1.2 8.2-10.4 16-12.2"
        stroke="#e85d04"
        strokeWidth="2.3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="12.2" cy="12.4" r="5.1" stroke="#f4f3ef" strokeWidth="1.7" fill="none" />
      <path
        d="M19.1 16.4l2.2 2.2 4.1-4.5"
        stroke="#ff8a3d"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span
      className={`font-display text-xl font-bold tracking-tight ${light ? "text-[#f4f3ef]" : "text-foreground"} ${className}`}
    >
      Karm <span className="text-[#e85d04]">Karo</span>
    </span>
  );
}
