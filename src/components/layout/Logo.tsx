export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg-shield" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7CFFB0" /><stop offset="1" stopColor="#4FE3F0" /></linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0C1E15" stroke="rgba(61,245,138,0.25)" />
      <path d="M16 5.5l8.5 3.6v6.6c0 5.6-3.7 9.4-8.5 10.6-4.8-1.2-8.5-5-8.5-10.6V9.1z" fill="none" stroke="url(#lg-shield)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 21.5v-8.2M16 16.2c-1.9-2.1-4.1-2.2-4.1-2.2s.1 3 4.1 3.9M16 14.6c1.9-2.1 4.1-2.2 4.1-2.2s-.1 3-4.1 3.9" stroke="#3DF58A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
