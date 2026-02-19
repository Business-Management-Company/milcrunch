/** Inline SVG illustrations for each built-in email template category. */
export default function TemplateIcon({ category, className = "h-12 w-12" }: { category: string; className?: string }) {
  const props = { className, viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg" } as const;
  const stroke = "rgba(255,255,255,0.85)";
  const sw = 2;

  switch (category) {
    /* Event Announcement — calendar with star */
    case "event":
      return (
        <svg {...props}>
          <rect x="8" y="12" width="32" height="28" rx="3" stroke={stroke} strokeWidth={sw} />
          <path d="M8 20h32" stroke={stroke} strokeWidth={sw} />
          <path d="M16 8v8M32 8v8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M24 26l2.5 4.5 5-.8-3.5 3.8.7 5L24 36l-4.7 2.5.7-5-3.5-3.8 5 .8z" fill={stroke} />
        </svg>
      );

    /* Creator Welcome — person with raised hand */
    case "welcome":
      return (
        <svg {...props}>
          <circle cx="24" cy="16" r="6" stroke={stroke} strokeWidth={sw} />
          <path d="M12 40c0-6.6 5.4-12 12-12s12 5.4 12 12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M34 10l3-4M37 14h4M34 18l3 4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );

    /* Sponsor Report — bar chart */
    case "report":
      return (
        <svg {...props}>
          <rect x="8" y="28" width="6" height="12" rx="1" fill={stroke} />
          <rect x="17" y="20" width="6" height="20" rx="1" fill={stroke} />
          <rect x="26" y="14" width="6" height="26" rx="1" fill={stroke} />
          <rect x="35" y="8" width="6" height="32" rx="1" fill={stroke} />
          <path d="M6 42h36" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );

    /* Newsletter — newspaper */
    case "newsletter":
      return (
        <svg {...props}>
          <rect x="6" y="8" width="30" height="32" rx="3" stroke={stroke} strokeWidth={sw} />
          <path d="M36 16v20a4 4 0 004 4h0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M42 40H12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M12 16h18M12 22h10M12 28h18M12 34h12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <rect x="26" y="22" width="6" height="8" rx="1" stroke={stroke} strokeWidth={sw} />
        </svg>
      );

    /* Event Reminder — bell */
    case "reminder":
      return (
        <svg {...props}>
          <path d="M24 6v2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M14 24c0-5.5 4.5-10 10-10s10 4.5 10 10v6l4 4H10l4-4v-6z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M20 36a4 4 0 008 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="37" cy="12" r="4" fill="#FBBF24" stroke={stroke} strokeWidth={1.5} />
          <path d="M37 10v2.5l1.5 1" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
        </svg>
      );

    /* Post-Event Thank You — trophy */
    case "thankyou":
      return (
        <svg {...props}>
          <path d="M16 8h16v12c0 4.4-3.6 8-8 8s-8-3.6-8-8V8z" stroke={stroke} strokeWidth={sw} />
          <path d="M16 14h-4a4 4 0 010-8h4M32 14h4a4 4 0 000-8h-4" stroke={stroke} strokeWidth={sw} />
          <path d="M24 28v4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <rect x="16" y="32" width="16" height="4" rx="2" stroke={stroke} strokeWidth={sw} />
          <path d="M14 38h20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M24 14l1.5 2.5 3-.5-2 2.5.5 3-3-1.5-3 1.5.5-3-2-2.5 3 .5z" fill="#FBBF24" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <rect x="10" y="10" width="28" height="28" rx="3" stroke={stroke} strokeWidth={sw} />
          <path d="M16 20h16M16 26h10M16 32h14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
  }
}
