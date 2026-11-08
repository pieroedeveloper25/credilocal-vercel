export function Logo({ size = 72 }: {
    size?: number;
}) {
    return (<svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <rect width="72" height="72" rx="20" fill="#3E5C76"/>
      <path d="M46 25.5A15 15 0 1 0 46 46.5" stroke="#fff" strokeWidth="5.5" strokeLinecap="round"/>
      <circle cx="49" cy="36" r="3.6" fill="#C9DCE8"/>
    </svg>);
}
