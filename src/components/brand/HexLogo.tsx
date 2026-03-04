/** MilCrunch tower + moat logo icon + "MilCrunch" wordmark in Sora 800. */
export function HexIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke="#f59e0b" strokeWidth="3"/>
      <circle cx="50" cy="50" r="44" fill="#0d1525"/>
      <circle cx="50" cy="50" r="35" fill="#0f1a2e"/>
      <rect x="30" y="38" width="40" height="28" rx="2" fill="#f59e0b"/>
      <rect x="30" y="30" width="8" height="10" rx="1.5" fill="#f59e0b"/>
      <rect x="41" y="30" width="8" height="10" rx="1.5" fill="#f59e0b"/>
      <rect x="52" y="30" width="8" height="10" rx="1.5" fill="#f59e0b"/>
      <rect x="62" y="30" width="8" height="10" rx="1.5" fill="#f59e0b"/>
      <rect x="42" y="52" width="16" height="14" rx="8" fill="#0f1a2e"/>
      <rect x="34" y="42" width="3.5" height="9" rx="1.5" fill="#0f1a2e"/>
      <rect x="62" y="42" width="5" height="9" rx="1.5" fill="#0f1a2e"/>
    </svg>
  );
}

interface HexLogoProps {
  /** "dark" = white text (for dark backgrounds), "light" = dark text (for light backgrounds) */
  variant?: "dark" | "light";
  /** Icon size in px */
  iconSize?: number;
  /** Text size class — defaults to text-xl */
  textClass?: string;
  className?: string;
}

export default function HexLogo({
  variant = "dark",
  iconSize = 24,
  textClass = "text-xl",
  className = "",
}: HexLogoProps) {
  const textColor = variant === "dark" ? "text-white" : "text-[#0f1a2e]";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <HexIcon size={iconSize} />
      <span
        className={`${textColor} ${textClass} tracking-tight`}
        style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800 }}
      >
        MilCrunch
      </span>
    </span>
  );
}
