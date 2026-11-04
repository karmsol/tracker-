export function Mark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1a1744" />
      <path d="M7 23c7-1.5 9-12 18-14" stroke="#e8610a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M16 7.5a8.2 8.2 0 1 0 5.8 14" stroke="#f6f1e8" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M19.2 16.2l2.3 2.3 4.2-4.6" stroke="#fb923c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`font-display text-xl tracking-tight ${light ? "text-[#f6f1e8]" : "text-foreground"}`}>
      Karm <span className="text-[#e8610a]">Karo</span>
    </span>
  );
}
